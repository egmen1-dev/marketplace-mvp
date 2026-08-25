#!/usr/bin/env tsx
/**
 * Release gate — production Docker image must run Prisma CLI (full dependency closure).
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectPrismaCliRuntime } from "./collect-prisma-cli-runtime.mjs";

const OUT = join(process.cwd(), "artifacts/release-pipeline");
const IMAGE = process.env.RAILWAY_RUNTIME_TEST_IMAGE ?? "marketplace-web-v2-prisma-test";

type Check = { id: string; ok: boolean; detail: string };

function sh(cmd: string, env?: NodeJS.ProcessEnv): string {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    env: env ? { ...process.env, ...env } : process.env,
  }).trim();
}

function hasDocker(): boolean {
  try {
    sh("docker version");
    return true;
  } catch {
    return false;
  }
}

function verifyCollectedRuntime() {
  const tempRoot = mkdtempSync(join(tmpdir(), "prisma-runtime-"));
  const checks: Check[] = [];

  try {
    const collected = collectPrismaCliRuntime(process.cwd(), tempRoot);
    const nodeModules = join(tempRoot, "node_modules");
    const prismaCli = join(nodeModules, "prisma", "build", "index.js");

    checks.push({
      id: "collect_prisma_closure",
      ok: collected.packageCount >= 10,
      detail: `Collected ${collected.packageCount} packages for Prisma CLI runtime`,
    });
    checks.push({
      id: "effect_present",
      ok: existsSync(join(nodeModules, "effect", "package.json")),
      detail: "effect package present in collected runtime",
    });
    checks.push({
      id: "prisma_cli_binary",
      ok: existsSync(prismaCli),
      detail: "prisma/build/index.js present",
    });
    checks.push({
      id: "migrations_present",
      ok: existsSync(join(tempRoot, "prisma", "migrations")),
      detail: "prisma/migrations present",
    });

    const entrypoint = readFileSync("scripts/docker-entrypoint.sh", "utf8");
    checks.push({
      id: "entrypoint_migration_first",
      ok: entrypoint.includes("prisma migrate deploy") && entrypoint.includes("exec node server.js"),
      detail: "docker-entrypoint.sh runs migrate deploy before server",
    });

    let prismaVersion = "";
    try {
      prismaVersion = sh(`node ${prismaCli} --version`, { NODE_PATH: nodeModules });
      checks.push({
        id: "prisma_cli_launch",
        ok: prismaVersion.includes("prisma"),
        detail: prismaVersion.split("\n")[0] || prismaVersion,
      });
    } catch (error) {
      checks.push({
        id: "prisma_cli_launch",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    const effectResult = spawnSync("node", ["-e", "require('effect'); console.log('effect-ok')"], {
      encoding: "utf8",
      env: { ...process.env, NODE_PATH: nodeModules },
    });
    const effectResolvable =
      effectResult.status === 0 && effectResult.stdout.includes("effect-ok");
    checks.push({
      id: "effect_require",
      ok: effectResolvable,
      detail: effectResolvable
        ? "require('effect') succeeds from collected runtime"
        : effectResult.stderr || effectResult.stdout || "require('effect') failed",
    });

    const verdict = checks.every((check) => check.ok) ? "PASS" : "FAIL";
    return { verdict, packageCount: collected.packageCount, prismaVersion, effectResolvable, checks };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function verifyDockerImage() {
  if (!hasDocker()) {
    return {
      verdict: "NOT_RUN" as const,
      checks: [{ id: "docker_available", ok: false, detail: "docker not available in environment" }],
    };
  }

  const checks: Check[] = [];
  try {
    sh(`docker build -t ${IMAGE} .`);
    checks.push({ id: "docker_build", ok: true, detail: `Built image ${IMAGE}` });

    const prismaVersion = sh(
      `docker run --rm --entrypoint sh ${IMAGE} -c "node /app/node_modules/prisma/build/index.js --version | head -1"`,
    );
    checks.push({
      id: "docker_prisma_version",
      ok: prismaVersion.length > 0,
      detail: prismaVersion,
    });

    const effectOk = sh(
      `docker run --rm --entrypoint sh ${IMAGE} -c "node -e \\"require('effect'); console.log('effect-ok')\\""`,
    );
    checks.push({
      id: "docker_effect_require",
      ok: effectOk.includes("effect-ok"),
      detail: effectOk,
    });

    const entrypoint = sh(`docker run --rm --entrypoint sh ${IMAGE} -c "test -x ./docker-entrypoint.sh && echo ok"`);
    checks.push({
      id: "docker_entrypoint_executable",
      ok: entrypoint.includes("ok"),
      detail: "docker-entrypoint.sh executable in final image",
    });

    const verdict = checks.every((check) => check.ok) ? "PASS" : "FAIL";
    return { verdict: verdict as "PASS" | "FAIL", checks };
  } catch (error) {
    checks.push({
      id: "docker_build",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    return { verdict: "FAIL" as const, checks };
  }
}

function main() {
  mkdirSync(OUT, { recursive: true });

  const collected = verifyCollectedRuntime();
  const docker = verifyDockerImage();

  const verdict =
    collected.verdict === "PASS" && docker.verdict !== "FAIL" ? "PASS" : "FAIL";

  const report = {
    generatedAt: new Date().toISOString(),
    collectedRuntime: collected,
    dockerImage: docker,
    invariant:
      "Production Docker image must include complete Prisma CLI dependency closure for prisma migrate deploy on boot.",
    verdict,
  };

  writeFileSync(join(OUT, "railway-runtime-verification.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(verdict === "PASS" ? 0 : 1);
}

main();
