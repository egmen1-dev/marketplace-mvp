#!/usr/bin/env node
/** Collect APK artifacts for RC10.7 build (PR #201 update journey hotfix). */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = resolve("artifacts/closed-beta-rc10.7");
const APK_NAME = "lot_android_closed_beta_0.1.15_beta.8.apk";
const apkPath = process.argv[2] ?? resolve(ARTIFACT_DIR, APK_NAME);
const commitSha = (process.env.EXPO_PUBLIC_COMMIT_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()).slice(0, 7);
const buildTime = process.env.EXPO_PUBLIC_BUILD_TIME ?? new Date().toISOString();

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

const bytes = readFileSync(apkPath);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const sizeBytes = statSync(apkPath).size;
const aapt = run("aapt", ["dump", "badging", apkPath]);

mkdirSync(ARTIFACT_DIR, { recursive: true });
writeFileSync(resolve(ARTIFACT_DIR, "sha256.txt"), `${sha256}\n`);
writeFileSync(resolve(ARTIFACT_DIR, "aapt-badging.txt"), `${aapt}\n`);

let apkanalyzer = "";
try {
  apkanalyzer = run("apkanalyzer", ["manifest", "print", apkPath]);
} catch {
  apkanalyzer = "# apkanalyzer not available — see aapt-badging.txt";
}
writeFileSync(resolve(ARTIFACT_DIR, "apkanalyzer-manifest.xml"), `${apkanalyzer}\n`);

const manifest = {
  candidate: "RC10.7",
  packageName: "ru.lot.marketplace.alpha",
  versionName: "0.1.15-beta.8",
  versionCode: 23,
  commitSha,
  mergeCommitSha: "654c16f",
  pr201MergeSha: "654c16f",
  buildTime,
  environment: "staging",
  releaseChannel: "CLOSED_BETA",
  betaChannel: "CLOSED_BETA",
  apiBaseUrl: "https://web-production-e56fb.up.railway.app",
  artifact: {
    fileName: APK_NAME,
    path: `artifacts/closed-beta-rc10.7/${APK_NAME}`,
    downloadUrl: `https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc10.7/${APK_NAME}`,
    sha256,
    sizeBytes,
  },
  android: {
    minSdk: Number(aapt.match(/sdkVersion:'(\d+)'/)?.[1] ?? 24),
    targetSdk: Number(aapt.match(/targetSdkVersion:'(\d+)'/)?.[1] ?? 36),
    abi: [aapt.match(/native-code: '([^']+)'/)?.[1] ?? "arm64-v8a"],
    newArchEnabled: false,
  },
  embeddedMetadata: {
    photoContinueFix: true,
    submitBlackHoleFix: true,
    sellerJourneyDiagnostics: true,
    asyncModerationBoundary: true,
    oneTapGuards: true,
    updateJourneyFix: true,
    updateUiContract: true,
    updateJourneyDiagnostics: true,
    previousRelease: "RC10.6 0.1.15-beta.7 (code 22)",
  },
  buildNotes: {
    release:
      "RC10.7 — update journey hotfix after PR #201 (canonical UI contract + sequence guard + journey diagnostics; no availableHint contradiction)",
    previousRelease: "RC10.6 0.1.15-beta.7 (code 22)",
    versionPolicy:
      "Closed Beta RC series increments versionCode monotonically (RC10.6=22 → RC10.7=23) and versionName beta patch (0.1.15-beta.7 → 0.1.15-beta.8)",
  },
};

writeFileSync(resolve(ARTIFACT_DIR, "build-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ sha256, sizeBytes, commitSha, apkPath }, null, 2));
