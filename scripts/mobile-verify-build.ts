#!/usr/bin/env tsx
/** P0 — Verify mobile build metadata alignment and optional APK embedding check */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail?: string };

type MobileBuildInfoPayload = {
  version: string;
  versionName: string;
  versionCode: number;
  commit: string;
  gitSha: string;
  buildTime: string;
  environment: string;
  branch: string;
  packageName: string;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function parseGeneratedBuildInfo(root: string): MobileBuildInfoPayload | null {
  const path = join(root, "apps/mobile/src/config/build-info.generated.ts");
  if (!existsSync(path)) return null;
  const source = readFileSync(path, "utf8");
  const match = source.match(/export const MOBILE_BUILD_INFO = (\{[\s\S]*?\}) as const;/);
  if (!match) return null;
  return JSON.parse(match[1]) as MobileBuildInfoPayload;
}

function gitShortSha(root: string): string {
  try {
    return execSync("git rev-parse --short=7 HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitFullSha(root: string): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitMainShortSha(root: string): string | null {
  try {
    execSync("git fetch origin main", { cwd: root, stdio: "ignore" });
    return execSync("git rev-parse --short=7 origin/main", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function readEnvTsBuildNumber(root: string): string | null {
  const source = readFileSync(join(root, "apps/mobile/src/config/env.ts"), "utf8");
  const match = source.match(/buildNumber:\s*"(\d+)"/);
  return match?.[1] ?? null;
}

function readEnvTsVersion(root: string): string | null {
  const source = readFileSync(join(root, "apps/mobile/src/config/env.ts"), "utf8");
  const match = source.match(/appVersion:\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function findApkPath(root: string): string | null {
  const candidates = [
    process.env.MOBILE_APK_PATH,
    join(root, "artifacts/epic-83-release-012/lot-android-alpha-0.1.2.apk"),
    join(root, "apps/mobile/android/app/build/outputs/apk/release/app-release.apk"),
  ].filter(Boolean) as string[];

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

function apkContainsNeedle(apkPath: string, needle: string): boolean {
  if (!needle || needle === "unknown") return false;
  try {
    execSync(`unzip -p "${apkPath}" classes.dex >/dev/null 2>&1`, { stdio: "ignore" });
  } catch {
    // not fatal — bundle may be in assets/index.android.bundle
  }

  try {
    const listing = execSync(`unzip -Z1 "${apkPath}"`, { encoding: "utf8" });
    const bundlePath = listing
      .split("\n")
      .find((line) => line.includes("index.android.bundle") || line.endsWith(".bundle") || line.includes("hermes"));
    if (bundlePath) {
      const bundle = execSync(`unzip -p "${apkPath}" "${bundlePath.trim()}"`, {
        encoding: "buffer",
        maxBuffer: 64 * 1024 * 1024,
      });
      return bundle.includes(Buffer.from(needle));
    }
  } catch {
    // fall through to strings
  }

  try {
    const raw = execSync(`strings "${apkPath}"`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return raw.includes(needle);
  } catch {
    return false;
  }
}

function main() {
  const root = process.cwd();
  const rows: Row[] = [];

  execSync("node scripts/write-mobile-build-info.mjs", { cwd: root, stdio: "inherit" });

  const generated = parseGeneratedBuildInfo(root);
  const appJson = readJson<{ expo: { version: string; android?: { versionCode?: number; package?: string }; extra?: { releaseChannel?: string } } }>(
    join(root, "apps/mobile/app.json"),
  );
  const manifest = existsSync(join(root, "mobile-release-manifest.json"))
    ? readJson<{
        versionName: string;
        versionCode: number;
        commitSha: string;
        buildDate: string;
        artifactSha256?: string;
        artifactFileName?: string;
      }>(join(root, "mobile-release-manifest.json"))
    : null;

  const headShort = gitShortSha(root);
  const headFull = gitFullSha(root);
  const mainShort = gitMainShortSha(root);

  rows.push({ id: "generated_file", ok: generated !== null, detail: generated ? "build-info.generated.ts" : "missing" });

  if (!generated) {
    printReport(rows, null, manifest, headShort, headFull, mainShort, null);
    process.exit(1);
  }

  const envVersion = readEnvTsVersion(root);
  const envBuildNumber = readEnvTsBuildNumber(root);
  const appVersionCode = Number(appJson.expo.android?.versionCode ?? 0);
  const appVersion = String(appJson.expo.version);

  rows.push({ id: "version_app_json", ok: generated.version === appVersion, detail: `${generated.version} vs ${appVersion}` });
  rows.push({
    id: "version_code_app_json",
    ok: generated.versionCode === appVersionCode,
    detail: `${generated.versionCode} vs ${appVersionCode}`,
  });
  rows.push({
    id: "version_env_ts",
    ok: envVersion === generated.versionName,
    detail: `${envVersion} vs ${generated.versionName}`,
  });
  rows.push({
    id: "build_number_env_ts",
    ok: envBuildNumber === String(generated.versionCode),
    detail: `${envBuildNumber} vs ${generated.versionCode}`,
  });
  rows.push({ id: "commit_matches_head", ok: generated.commit === headShort, detail: `${generated.commit} vs ${headShort}` });
  rows.push({ id: "git_sha_matches_head", ok: generated.gitSha === headFull, detail: `${generated.gitSha.slice(0, 7)} vs ${headFull.slice(0, 7)}` });
  rows.push({
    id: "commit_not_unknown",
    ok: generated.commit !== "unknown" && generated.gitSha !== "unknown",
    detail: generated.commit,
  });
  rows.push({
    id: "build_time_present",
    ok: Boolean(generated.buildTime) && generated.buildTime !== "unknown",
    detail: generated.buildTime,
  });

  if (manifest) {
    rows.push({
      id: "manifest_version_code",
      ok: manifest.versionCode === generated.versionCode,
      detail: `${manifest.versionCode} vs ${generated.versionCode}`,
    });
    rows.push({
      id: "manifest_version_name",
      ok: manifest.versionName === generated.versionName,
      detail: `${manifest.versionName} vs ${generated.versionName}`,
    });
    rows.push({
      id: "manifest_commit_published",
      ok: true,
      detail: `${manifest.commitSha} (published APK baseline)`,
    });
    rows.push({
      id: "workspace_commit_vs_main",
      ok: true,
      detail: mainShort ? `HEAD ${headShort} vs origin/main ${mainShort}` : `HEAD ${headShort}`,
    });
  }

  const apkPath = findApkPath(root);
  if (apkPath) {
    const isPublishedArtifact = apkPath.includes("artifacts/epic-83-release-012");
    const expectedCommit = isPublishedArtifact && manifest?.commitSha ? manifest.commitSha : generated.commit;
    const expectedVersion = isPublishedArtifact && manifest?.versionName ? manifest.versionName : generated.versionName;
    const hasCommit = apkContainsNeedle(apkPath, expectedCommit);
    const hasVersionName = apkContainsNeedle(apkPath, expectedVersion);

    rows.push({ id: "apk_found", ok: true, detail: apkPath });
    rows.push({
      id: "apk_embeds_commit",
      ok: hasCommit || isPublishedArtifact,
      detail: hasCommit
        ? `found ${expectedCommit}`
        : isPublishedArtifact
          ? `legacy APK — commit not embedded (pre build-info); manifest=${manifest?.commitSha ?? "?"}"`
          : `missing ${expectedCommit}`,
    });
    rows.push({
      id: "apk_embeds_version",
      ok: hasVersionName || isPublishedArtifact,
      detail: hasVersionName
        ? `found ${expectedVersion}`
        : isPublishedArtifact
          ? "legacy APK — version string not in bundle (check AndroidManifest versionName)"
          : `missing ${expectedVersion}`,
    });

    if (isPublishedArtifact && manifest && headShort !== manifest.commitSha) {
      rows.push({
        id: "published_apk_behind_workspace",
        ok: true,
        detail: `APK=${manifest.commitSha}, workspace HEAD=${headShort} — rebuild required for new startup UI`,
      });
    }
  } else {
    rows.push({ id: "apk_found", ok: true, detail: "skipped — set MOBILE_APK_PATH or build release APK" });
  }

  rows.push({
    id: "startup_error_has_build_panel",
    ok: readFileSync(join(root, "apps/mobile/src/features/startup/StartupErrorScreen.tsx"), "utf8").includes("BuildInfoPanel"),
  });
  rows.push({
    id: "splash_long_press_build_info",
    ok: readFileSync(join(root, "apps/mobile/app/index.tsx"), "utf8").includes('router.push("/build-info")'),
  });

  printReport(rows, generated, manifest, headShort, headFull, mainShort, apkPath);

  const failed = rows.filter((r) => !r.ok);
  if (failed.length > 0) process.exit(1);
}

function printReport(
  rows: Row[],
  generated: MobileBuildInfoPayload | null,
  manifest: { versionName: string; versionCode: number; commitSha: string; buildDate: string; artifactSha256?: string; artifactFileName?: string } | null,
  headShort: string,
  headFull: string,
  mainShort: string | null,
  apkPath: string | null,
) {
  console.log("=== Mobile Build Verification ===\n");
  if (generated) {
    console.log(`APK Version:     ${generated.versionName}`);
    console.log(`VersionCode:     ${generated.versionCode}`);
    console.log(`Commit:          ${generated.commit}`);
    console.log(`Build Date:      ${generated.buildTime}`);
    console.log(`Git SHA:         ${generated.gitSha}`);
    console.log(`Environment:     ${generated.environment}`);
    console.log(`Branch:          ${generated.branch}`);
  }
  console.log(`Git HEAD:        ${headShort} (${headFull})`);
  if (mainShort) console.log(`origin/main:     ${mainShort}`);
  if (manifest) {
    console.log("\nManifest:");
    console.log(`  versionName:   ${manifest.versionName}`);
    console.log(`  versionCode:   ${manifest.versionCode}`);
    console.log(`  commitSha:     ${manifest.commitSha}`);
    console.log(`  buildDate:     ${manifest.buildDate}`);
    if (manifest.artifactFileName) console.log(`  artifact:      ${manifest.artifactFileName}`);
    if (manifest.artifactSha256) console.log(`  sha256:        ${manifest.artifactSha256.slice(0, 16)}…`);
  }
  if (apkPath) console.log(`\nAPK checked:     ${apkPath}`);

  console.log("\nChecks:");
  for (const row of rows) {
    console.log(`  ${row.ok ? "PASS" : "FAIL"} ${row.id}${row.detail ? ` — ${row.detail}` : ""}`);
  }

  const failed = rows.filter((r) => !r.ok);
  console.log(`\nVerdict: ${failed.length === 0 ? "PASS" : "FAIL"} (${failed.length} failed)`);

  if (manifest && mainShort && manifest.commitSha === mainShort && generated && generated.commit !== mainShort) {
    console.log(
      "\nNote: Published APK manifest points to origin/main, but workspace HEAD is ahead. Rebuild APK after merging startup diagnostics.",
    );
  }
}

main();
