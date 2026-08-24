#!/usr/bin/env node
/** Collect APK artifacts for RC10 build (sha256, aapt, apkanalyzer, build-manifest). */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = resolve("artifacts/closed-beta-rc10");
const APK_NAME = "lot_android_closed_beta_0.1.15_beta.1.apk";
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
  candidate: "RC10",
  packageName: "ru.lot.marketplace.alpha",
  versionName: "0.1.15-beta.1",
  versionCode: 16,
  commitSha,
  mergeCommitSha: commitSha,
  buildTime,
  environment: "staging",
  releaseChannel: "CLOSED_BETA",
  betaChannel: "CLOSED_BETA",
  apiBaseUrl: "https://web-production-e56fb.up.railway.app",
  artifact: {
    fileName: APK_NAME,
    path: `artifacts/closed-beta-rc10/${APK_NAME}`,
    downloadUrl: `https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc10/${APK_NAME}`,
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
    epic158_1_lotUxHardening: true,
    epic158_2_sellerUxSimplify: true,
    epic158_3_previewUpdate: true,
    epic159_sellerBetaAcceptance: true,
    lotAutosave: true,
    lotRestorePrompt: true,
    pickupPointsApi: true,
    epic152_sellerLoop: true,
    epic154_criticalPath: true,
    updateRoute: true,
  },
  buildNotes: {
    release: "RC10 — EPIC 158.1–158.3 + EPIC 159 Seller Beta Acceptance",
    previousRelease: "RC9.1 0.1.14-beta.2 (code 15)",
  },
};

writeFileSync(resolve(ARTIFACT_DIR, "build-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ sha256, sizeBytes, commitSha, apkPath }, null, 2));
