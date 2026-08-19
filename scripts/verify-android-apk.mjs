#!/usr/bin/env node
/**
 * Verify Android APK install metadata for Closed Beta RC builds.
 * Usage: node scripts/verify-android-apk.mjs path/to.apk
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const apkPath = process.argv[2];
if (!apkPath) {
  console.error("Usage: node scripts/verify-android-apk.mjs <apk-path>");
  process.exit(1);
}

const fullPath = resolve(apkPath);
const bytes = readFileSync(fullPath);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const size = statSync(fullPath).size;

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim();
  } catch (err) {
    return `ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }
}

const aapt = run("aapt", ["dump", "badging", fullPath]);
const apksigner = run("apksigner", ["verify", "--print-certs", fullPath]);

const report = {
  path: fullPath,
  sizeBytes: size,
  sha256,
  package: aapt.match(/package: name='([^']+)'/)?.[1],
  versionCode: aapt.match(/versionCode='([^']+)'/)?.[1],
  versionName: aapt.match(/versionName='([^']+)'/)?.[1],
  minSdk: aapt.match(/sdkVersion:'([^']+)'/)?.[1],
  targetSdk: aapt.match(/targetSdkVersion:'([^']+)'/)?.[1],
  nativeCode: aapt.match(/native-code: '([^']+)'/)?.[1],
  signing: apksigner.split("\n").slice(0, 6).join("\n"),
};

console.log(JSON.stringify(report, null, 2));

if (size < 50_000_000) {
  console.warn("WARN: APK smaller than 50MB — download may be truncated (common cause of 'Package is invalid').");
}
