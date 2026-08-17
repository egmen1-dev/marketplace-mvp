#!/usr/bin/env tsx
/** P0 — Verify Expo native modules match SDK bundledNativeModules (prevents AnyTypeProvider crashes). */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function repoRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "apps/mobile/package.json"))) return cwd;
  if (existsSync(join(cwd, "package.json")) && existsSync(join(cwd, "../../apps/mobile/package.json"))) {
    return join(cwd, "../..");
  }
  if (existsSync(join(cwd, "package.json")) && cwd.endsWith(`${join("apps", "mobile")}`)) {
    return join(cwd, "../..");
  }
  return cwd;
}

const root = repoRoot();
const mobileRoot = join(root, "apps/mobile");
const pkgPath = join(mobileRoot, "package.json");
const lockPath = join(mobileRoot, "package-lock.json");
const bundledPath = join(mobileRoot, "node_modules/expo/bundledNativeModules.json");

type Row = { id: string; ok: boolean; detail?: string };

function installedVersion(lock: Record<string, { version?: string }>, name: string): string | null {
  return lock.packages?.[`node_modules/${name}`]?.version ?? null;
}

function majorPrefix(expected: string): string | null {
  const m = expected.match(/[~^]?(\d+)/);
  return m?.[1] ?? null;
}

function main() {
  const rows: Row[] = [];
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { dependencies?: Record<string, string> };
  const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
    packages?: Record<string, { version?: string }>;
  };
  const bundled = JSON.parse(readFileSync(bundledPath, "utf8")) as Record<string, string>;

  const auditPackages = [
    "expo",
    "expo-modules-core",
    "expo-clipboard",
    "expo-constants",
    "expo-file-system",
    "expo-linking",
    "expo-secure-store",
    "expo-splash-screen",
    "expo-font",
    "expo-system-ui",
    "expo-router",
    "expo-updates",
    "react-native",
    "react-native-reanimated",
    "react-native-screens",
    "react-native-safe-area-context",
    "react-native-gesture-handler",
  ];

  for (const name of auditPackages) {
    const expected = bundled[name] ?? (name === "expo-modules-core" ? bundled.expo : undefined);
    const declared = pkg.dependencies?.[name];
    let installed = installedVersion(lock, name);

    if (!installed && (name === "expo-modules-core" || name.startsWith("expo-"))) {
      try {
        const out = execSync(`npm ls ${name} --prefix apps/mobile --depth=0 --json`, {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        const tree = JSON.parse(out) as { dependencies?: Record<string, { version?: string }> };
        installed = tree.dependencies?.[name]?.version ?? null;
      } catch {
        /* optional transitive */
      }
    }

    if (name === "react-native") {
      installed = installedVersion(lock, "react-native");
    }

    const ok =
      name === "expo-clipboard"
        ? installed?.startsWith("57.") === true && declared?.includes("57.")
        : expected
          ? installed
            ? installed.startsWith(majorPrefix(expected) ?? "")
            : true
          : true;

    rows.push({
      id: name.replace(/[^a-z0-9]+/gi, "_"),
      ok,
      detail: `declared=${declared ?? "transitive"} installed=${installed ?? "n/a"} expected=${expected ?? "n/a"}`,
    });
  }

  // Hard fail: prebuilt clipboard AAR must not be 8.x (references removed AnyTypeProvider)
  const clipAar = join(
    mobileRoot,
    "node_modules/expo-clipboard/local-maven-repo/host/exp/exponent/expo.modules.clipboard",
  );
  const clipDirs = existsSync(clipAar)
    ? execSync(`ls "${clipAar}"`, { encoding: "utf8" }).trim().split("\n")
    : [];
  const clipVersion = clipDirs[0] ?? "missing";
  rows.push({
    id: "expo_clipboard_prebuilt_aar",
    ok: clipVersion.startsWith("57."),
    detail: `prebuilt=${clipVersion}`,
  });

  const failed = rows.filter((r) => !r.ok);
  console.log(JSON.stringify({ verdict: failed.length === 0 ? "PASS" : "FAIL", rows }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
