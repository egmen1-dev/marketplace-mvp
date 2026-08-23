#!/usr/bin/env node
/**
 * RC5 release identity gate — verify APK metadata matches expected RC5 values.
 * Usage: EXPECTED_VERSION=0.1.10-beta.1 EXPECTED_VERSION_CODE=9 EXPECTED_COMMIT=abc1234 \
 *        node scripts/rc5-release-identity-gate.mjs artifacts/closed-beta-rc5/*.apk
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const apkPath = process.argv[2];
if (!apkPath) {
  console.error("Usage: node scripts/rc5-release-identity-gate.mjs <apk-path>");
  process.exit(1);
}

const expectedVersion = process.env.EXPECTED_VERSION ?? "0.1.10-beta.1";
const expectedCode = process.env.EXPECTED_VERSION_CODE ?? "9";
const expectedCommit = (process.env.EXPECTED_COMMIT ?? "").slice(0, 7);

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
const versionName = aapt.match(/versionName='([^']+)'/)?.[1];
const versionCode = aapt.match(/versionCode='([^']+)'/)?.[1];
const packageName = aapt.match(/package: name='([^']+)'/)?.[1];

// Extract commit from bundle if present
const unzipList = run("unzip", ["-l", fullPath]);
const bundleCommit = run("bash", [
  "-c",
  `unzip -p '${fullPath}' 'assets/index.android.bundle' 2>/dev/null | grep -o 'EXPO_PUBLIC_COMMIT_SHA[^"]*' | head -1 || true`,
]);

const checks = [
  { name: "package", ok: packageName === "ru.lot.marketplace.alpha", expected: "ru.lot.marketplace.alpha", actual: packageName },
  { name: "versionName", ok: versionName === expectedVersion, expected: expectedVersion, actual: versionName },
  { name: "versionCode", ok: versionCode === expectedCode, expected: expectedCode, actual: versionCode },
  {
    name: "commitSha",
    ok: !expectedCommit || bundleCommit.includes(expectedCommit) || run("bash", ["-c", `unzip -p '${fullPath}' 'assets/index.android.bundle' 2>/dev/null | grep -q '${expectedCommit}' && echo yes || echo no`]).includes("yes"),
    expected: expectedCommit || "any",
    actual: expectedCommit ? `grep in bundle` : "skipped",
  },
];

const verdict = checks.every((c) => c.ok) ? "PASS" : "BUILD_FAILED";
const report = { path: fullPath, sizeBytes: size, sha256, checks, verdict };

console.log(JSON.stringify(report, null, 2));
process.exit(verdict === "PASS" ? 0 : 1);
