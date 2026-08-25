#!/usr/bin/env node
/**
 * Collect the lockfile-resolved Prisma CLI dependency closure into a portable tree.
 * Dockerfile runner stage uses this instead of cherry-picking @prisma/* packages.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_PACKAGE = "prisma";

function readPackageJson(pkgDir) {
  const pkgPath = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json missing at ${pkgDir}`);
  }
  return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
}

function resolvePackageDir(name, searchFromDir, rootNodeModules) {
  let cur = searchFromDir;
  while (true) {
    const candidate = path.join(cur, "node_modules", ...name.split("/"));
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  const rootCandidate = path.join(rootNodeModules, ...name.split("/"));
  if (fs.existsSync(path.join(rootCandidate, "package.json"))) {
    return rootCandidate;
  }

  throw new Error(`Cannot resolve package: ${name} from ${searchFromDir}`);
}

function listPackageDirs(rootNodeModules) {
  const seenNames = new Set();
  const packageDirs = new Set();

  function walk(name, contextDir) {
    if (seenNames.has(name)) return;
    seenNames.add(name);

    const pkgDir = resolvePackageDir(name, contextDir, rootNodeModules);
    packageDirs.add(pkgDir);

    const pkg = readPackageJson(pkgDir);
    const deps = { ...pkg.dependencies, ...pkg.optionalDependencies };
    for (const dep of Object.keys(deps)) {
      walk(dep, pkgDir);
    }
  }

  const bootstrapPkg = path.join(rootNodeModules, ROOT_PACKAGE, "package.json");
  if (!fs.existsSync(bootstrapPkg)) {
    throw new Error(`${ROOT_PACKAGE} not found in ${rootNodeModules}`);
  }

  walk(ROOT_PACKAGE, rootNodeModules);
  return [...packageDirs];
}

function findNodeModulesRoot(pkgDir) {
  let cur = pkgDir;
  while (cur !== path.dirname(cur)) {
    if (path.basename(cur) === "node_modules") return cur;
    cur = path.dirname(cur);
  }
  throw new Error(`node_modules root not found for ${pkgDir}`);
}

function copyPackageDir(srcDir, destNodeModulesRoot) {
  const nmRoot = findNodeModulesRoot(srcDir);
  const rel = path.relative(nmRoot, srcDir);
  const dest = path.join(destNodeModulesRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) return;
  fs.cpSync(srcDir, dest, { recursive: true });
}

export function collectPrismaCliRuntime(sourceRoot, destRoot) {
  const sourceNodeModules = path.join(sourceRoot, "node_modules");
  const destNodeModules = path.join(destRoot, "node_modules");
  fs.mkdirSync(destNodeModules, { recursive: true });

  const dirs = listPackageDirs(sourceNodeModules);
  for (const dir of dirs) {
    copyPackageDir(dir, destNodeModules);
  }

  const prismaDir = path.join(sourceRoot, "prisma");
  if (fs.existsSync(prismaDir)) {
    fs.cpSync(prismaDir, path.join(destRoot, "prisma"), { recursive: true });
  }

  const generatedClient = path.join(sourceNodeModules, ".prisma");
  if (fs.existsSync(generatedClient)) {
    fs.cpSync(generatedClient, path.join(destNodeModules, ".prisma"), { recursive: true });
  }

  return {
    packageCount: dirs.length,
    packages: dirs.map((dir) => path.relative(sourceNodeModules, dir)).sort(),
  };
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  const [sourceRoot, destRoot] = process.argv.slice(2);
  if (!sourceRoot || !destRoot) {
    console.error("Usage: collect-prisma-cli-runtime.mjs <sourceRoot> <destRoot>");
    process.exit(1);
  }
  const result = collectPrismaCliRuntime(sourceRoot, destRoot);
  console.log(JSON.stringify(result, null, 2));
}
