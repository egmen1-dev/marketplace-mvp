#!/usr/bin/env tsx
/** P0 — Release smoke: validate release APK readiness without Metro dev server. */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail?: string };

const ROOT = process.cwd();
const MOBILE = join(ROOT, "apps/mobile");
const ANDROID = join(MOBILE, "android");
const RELEASE_APK = join(ANDROID, "app/build/outputs/apk/release/app-release.apk");
const ARTIFACTS = join(ROOT, "artifacts/epic-84-p0-startup");

function sha256File(path: string): string {
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

function main() {
  const rows: Row[] = [];

  rows.push({ id: "write_build_info", ok: run("npm run mobile:write-build-info") });
  rows.push({ id: "build_info_generated", ok: existsSync(join(MOBILE, "src/config/build-info.generated.ts")) });

  const generated = readFileSync(join(MOBILE, "src/config/build-info.generated.ts"), "utf8");
  rows.push({ id: "build_info_version_014", ok: generated.includes('"0.1.4"') && generated.includes('"versionCode": 5') });

  const appConfig = readFileSync(join(MOBILE, "app.config.js"), "utf8");
  rows.push({ id: "lazy_router_import_mode", ok: appConfig.includes("EXPO_ROUTER_IMPORT_MODE") && appConfig.includes("lazy") });
  rows.push({ id: "new_arch_disabled", ok: appConfig.includes("newArchEnabled: false") });

  const entry = readFileSync(join(MOBILE, "index.js"), "utf8");
  rows.push({ id: "custom_entry", ok: entry.includes("expo-router/entry") && entry.includes("registerFatalBootstrap") });

  const layout = readFileSync(join(MOBILE, "app/_layout.tsx"), "utf8");
  rows.push({ id: "root_error_boundary", ok: layout.includes("RootErrorBoundary") && layout.includes("StartupFatalGate") });
  rows.push({ id: "deferred_providers", ok: layout.includes("LazyNetworkBanner") && layout.includes("LazyUpdateHost") });

  rows.push({ id: "mobile_typecheck", ok: run("npm run mobile:typecheck") });
  rows.push({ id: "p0_startup_gate", ok: run("npm run product:epic-84:p0-startup") });

  rows.push({ id: "android_bundle_export", ok: run("npx expo export --platform android", MOBILE) });

  if (!existsSync(ANDROID)) {
    rows.push({ id: "expo_prebuild", ok: run("npx expo prebuild --platform android --no-install", MOBILE) });
  } else {
    rows.push({ id: "expo_prebuild", ok: true, detail: "android/ exists" });
  }

  rows.push({ id: "assemble_release", ok: run("./gradlew assembleRelease", join(ANDROID)) });
  rows.push({ id: "release_apk_exists", ok: existsSync(RELEASE_APK), detail: RELEASE_APK });

  let apkMeta: Record<string, unknown> | null = null;
  if (existsSync(RELEASE_APK)) {
    const sha256 = sha256File(RELEASE_APK);
    const size = statSync(RELEASE_APK).size;
    apkMeta = { sha256, sizeBytes: size, path: RELEASE_APK };
    rows.push({ id: "release_apk_sha256", ok: sha256.length === 64, detail: sha256 });
    rows.push({ id: "release_apk_size", ok: size > 1_000_000, detail: String(size) });

    const assets = ["assets/icon.png", "assets/splash-icon.png", "assets/android-icon-foreground.png"];
    for (const asset of assets) {
      rows.push({ id: `asset_${asset.split("/").pop()}`, ok: existsSync(join(MOBILE, asset)), detail: asset });
    }

    const envSource = readFileSync(join(MOBILE, "src/config/env.ts"), "utf8");
    rows.push({ id: "no_localhost_default", ok: !envSource.includes('?? "http://localhost') });
    rows.push({ id: "staging_api_default", ok: envSource.includes("web-production-e56fb.up.railway.app") });
  }

  const failed = rows.filter((r) => !r.ok);
  const report = {
    epic: "EPIC-84",
    phase: "P0 Release Smoke",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    apk: apkMeta,
    rows,
  };

  mkdirSync(ARTIFACTS, { recursive: true });
  writeFileSync(join(ARTIFACTS, "release-smoke-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

function run(cmd: string, cwd = ROOT): boolean {
  try {
    execSync(cmd, { cwd, stdio: "pipe" });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[release-smoke] failed: ${cmd}\n${message}`);
    return false;
  }
}

main();
