#!/usr/bin/env tsx
/** Shared helpers for mobile P0 release gates. */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type GateRow = { id: string; ok: boolean; detail?: string };

export function repoRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "apps/mobile/package.json"))) return cwd;
  if (existsSync(join(cwd, "package.json")) && cwd.endsWith(`${join("apps", "mobile")}`)) {
    return join(cwd, "../..");
  }
  return cwd;
}

export function mobilePaths(root = repoRoot()) {
  return {
    root,
    mobile: join(root, "apps/mobile"),
    android: join(root, "apps/mobile/android"),
    releaseApk: join(root, "apps/mobile/android/app/build/outputs/apk/release/app-release.apk"),
    bundledNativeModules: join(root, "apps/mobile/node_modules/expo/bundledNativeModules.json"),
    pkgJson: join(root, "apps/mobile/package.json"),
    lockJson: join(root, "apps/mobile/package-lock.json"),
    artifacts: join(root, "artifacts/epic-84-p0-startup"),
  };
}

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function resolveAapt(): string {
  const fromEnv = process.env.ANDROID_AAPT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? "/workspace/.android-sdk";
  const candidates = execSync(`ls -1 ${sdk}/build-tools/*/aapt 2>/dev/null || true`, {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  const aapt = candidates.at(-1);
  if (!aapt) throw new Error("aapt not found — set ANDROID_AAPT or install Android build-tools");
  return aapt;
}

export function resolveApkanalyzer(): string | null {
  const fromEnv = process.env.APKANALYZER?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? "/workspace/.android-sdk";
  const candidate = join(sdk, "cmdline-tools/latest/bin/apkanalyzer");
  return existsSync(candidate) ? candidate : null;
}

export function installedFromLock(
  lock: { packages?: Record<string, { version?: string }> },
  name: string,
): string | null {
  return lock.packages?.[`node_modules/${name}`]?.version ?? null;
}

/** Minimal range check aligned with npm semver used by Expo bundledNativeModules. */
export function satisfiesExpoRange(installed: string | null, expected: string | undefined): boolean {
  if (!expected) return true;
  if (!installed) return false;

  const range = expected.trim();
  if (range.startsWith("~")) {
    const base = range.slice(1);
    const parts = base.split(".");
    if (parts.length >= 2) {
      return installed.startsWith(`${parts[0]}.${parts[1]}.`);
    }
    return installed.startsWith(`${parts[0]}.`);
  }
  if (range.startsWith("^")) {
    const base = range.slice(1);
    const major = base.split(".")[0];
    return installed.split(".")[0] === major;
  }
  return installed === range;
}

export function readBundledNativeModules(root = repoRoot()): Record<string, string> {
  const path = join(root, "apps/mobile/node_modules/expo/bundledNativeModules.json");
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
}

export function readMobileLock(root = repoRoot()) {
  return JSON.parse(readFileSync(join(root, "apps/mobile/package-lock.json"), "utf8")) as {
    packages?: Record<string, { version?: string }>;
  };
}

export function readMobilePkg(root = repoRoot()) {
  return JSON.parse(readFileSync(join(root, "apps/mobile/package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
}

export function resolveInstalled(name: string, lock: ReturnType<typeof readMobileLock>, root: string): string | null {
  let installed = installedFromLock(lock, name);
  if (installed) return installed;

  // Nested transitive installs appear under scoped paths in lockfile.
  if (lock.packages) {
    for (const [path, meta] of Object.entries(lock.packages)) {
      if (path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`)) {
        if (meta.version) return meta.version;
      }
    }
  }

  try {
    const out = execSync(`npm ls ${name} --prefix apps/mobile --json`, {
      encoding: "utf8",
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const tree = JSON.parse(out) as {
      name?: string;
      version?: string;
      dependencies?: Record<string, { version?: string }>;
    };
    if (tree.dependencies?.[name]?.version) return tree.dependencies[name].version;
    if (tree.name === name && tree.version) return tree.version;
    return null;
  } catch (err) {
    const stdout = (err as { stdout?: Buffer }).stdout?.toString("utf8") ?? "";
    if (stdout) {
      try {
        const tree = JSON.parse(stdout) as {
          name?: string;
          version?: string;
          dependencies?: Record<string, { version?: string }>;
        };
        if (tree.dependencies?.[name]?.version) return tree.dependencies[name].version;
        if (tree.name === name && tree.version) return tree.version;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

export const REQUIRED_EXPO_PACKAGES = [
  "expo-clipboard",
  "expo-secure-store",
  "expo-file-system",
  "expo-linking",
  "expo-font",
  "expo-constants",
  "expo-router",
  "expo-splash-screen",
  "expo-device",
  "expo-network",
] as const;

export function auditExpoPackages(root = repoRoot()): GateRow[] {
  const bundled = readBundledNativeModules(root);
  const lock = readMobileLock(root);
  const pkg = readMobilePkg(root);
  const rows: GateRow[] = [];

  for (const name of REQUIRED_EXPO_PACKAGES) {
    const expected = bundled[name];
    const declared = pkg.dependencies?.[name];
    const installed = resolveInstalled(name, lock, root);
    const ok =
      !installed && !declared
        ? true
        : satisfiesExpoRange(installed, expected);
    rows.push({
      id: name.replace(/[^a-z0-9]+/gi, "_"),
      ok,
      detail: `declared=${declared ?? "transitive"} installed=${installed ?? "not-used"} expected=${expected ?? "missing"}`,
    });
  }

  const clipAarRoot = join(
    root,
    "apps/mobile/node_modules/expo-clipboard/local-maven-repo/host/exp/exponent/expo.modules.clipboard",
  );
  const clipVersion = existsSync(clipAarRoot)
    ? execSync(`ls "${clipAarRoot}"`, { encoding: "utf8" }).trim().split("\n")[0]
    : "missing";
  rows.push({
    id: "expo_clipboard_prebuilt_aar",
    ok: clipVersion.startsWith("57."),
    detail: `prebuilt=${clipVersion}`,
  });

  rows.push({
    id: "expo_clipboard_regression_guard",
    ok: !clipVersion.startsWith("8."),
    detail: "MOBILE-P0-EXPO-CLIPBOARD-ANYTYPEPROVIDER regression",
  });

  return rows;
}

export function countDexString(apkPath: string, needle: string): number {
  const tmp = execSync("mktemp -d", { encoding: "utf8" }).trim();
  try {
    execSync(`unzip -q "${apkPath}" "classes*.dex" -d "${tmp}"`, { stdio: "pipe" });
    const out = execSync(
      `grep -a -o -F ${JSON.stringify(needle)} "${tmp}"/classes*.dex 2>/dev/null | wc -l`,
      { encoding: "utf8", shell: "/bin/bash", maxBuffer: 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] },
    );
    return Number(out.trim()) || 0;
  } finally {
    execSync(`rm -rf "${tmp}"`, { stdio: "pipe" });
  }
}

export function emitReport(
  phase: string,
  rows: GateRow[],
  extra: Record<string, unknown> = {},
  artifactName?: string,
) {
  const failed = rows.filter((r) => !r.ok);
  const report = {
    phase,
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
    ...extra,
  };
  if (artifactName) {
    const { artifacts } = mobilePaths();
    execSync(`mkdir -p "${artifacts}"`, { stdio: "pipe" });
    const out = join(artifacts, artifactName);
    writeFileSync(out, JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}
