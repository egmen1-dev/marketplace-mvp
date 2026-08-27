#!/usr/bin/env node
/** Collect APK artifacts for RC10.8 bootstrap build (Self-Update V2). */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = resolve("artifacts/closed-beta-rc10.8");
const APK_NAME = "lot_android_closed_beta_0.1.15_beta.9.apk";
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

const manifest = {
  candidate: "RC10.8",
  role: "BOOTSTRAP_FIXED_RC",
  packageName: "ru.lot.marketplace.alpha",
  versionName: "0.1.15-beta.9",
  versionCode: 24,
  commitSha,
  mergeCommitSha: "e062f77",
  pr208MergeSha: "e062f77",
  buildTime,
  environment: "staging",
  releaseChannel: "CLOSED_BETA",
  betaChannel: "CLOSED_BETA",
  apiBaseUrl: "https://web-production-e56fb.up.railway.app",
  artifact: {
    fileName: APK_NAME,
    path: `artifacts/closed-beta-rc10.8/${APK_NAME}`,
    downloadUrl: `https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc10.8/${APK_NAME}`,
    proxyUrl: "https://web-production-e56fb.up.railway.app/api/mobile/releases/apk?versionCode=24",
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
    selfUpdateV2: true,
    chunkedSha256: true,
    updateStateMachineV2: true,
    updateJourneyDiagnosticsV2: true,
    sellerJourneyFixes: true,
  },
  buildNotes: {
    release: "RC10.8 — BOOTSTRAP_FIXED_RC with Android Self-Update V2 (PR #208)",
    previousRelease: "RC10.7 0.1.15-beta.8 (code 23)",
    bootstrapPath: "RC10.5 → browser/manual install → RC10.8 (no uninstall)",
    physicalProofRole: "First on-device build containing V2 updater — not the in-app proof target",
  },
};

writeFileSync(resolve(ARTIFACT_DIR, "build-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ sha256, sizeBytes, commitSha, apkPath }, null, 2));
