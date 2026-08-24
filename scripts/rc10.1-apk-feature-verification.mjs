#!/usr/bin/env node
/** RC10.1 APK forensics — P0 photo upload + RC10 stack symbols in assembled bundle. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const apkPath = process.argv[2] ?? "artifacts/closed-beta-rc10.1/lot_android_closed_beta_0.1.15_beta.2.apk";
const OUT = resolve("artifacts/closed-beta-rc10.1/apk-feature-verification.json");
const fullPath = resolve(apkPath);

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function bundleContains(pattern) {
  const out = run("bash", [
    "-c",
    `unzip -p '${fullPath}' 'assets/index.android.bundle' 2>/dev/null | strings | grep -F '${pattern}' | head -1`,
  ]);
  return out.length > 0;
}

const bytes = readFileSync(fullPath);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const sizeBytes = statSync(fullPath).size;
const aapt = run("aapt", ["dump", "badging", fullPath]);

const identity = {
  package: aapt.match(/package: name='([^']+)'/)?.[1],
  versionName: aapt.match(/versionName='([^']+)'/)?.[1],
  versionCode: aapt.match(/versionCode='([^']+)'/)?.[1],
  nativeCode: aapt.match(/native-code: '([^']+)'/)?.[1],
  sha256,
  sizeBytes,
};

const symbolGroups = {
  p0_photoUpload: [
    { name: "uploadSellerLotImage", pattern: "uploadSellerLotImage" },
    { name: "normalizeImagePickerAsset", pattern: "normalizeImagePickerAsset" },
    { name: "defaultLotPhotoFileName", pattern: "defaultLotPhotoFileName" },
    { name: "processUploadQueue", pattern: "processUploadQueue" },
    { name: "uploadInProgress", pattern: "uploadInProgress" },
    { name: "uploadWaitPublish", pattern: "uploadWaitPublish" },
    { name: "mobileSellerUploadRoute", pattern: "/api/mobile/seller/uploads" },
    { name: "expoFileSystem", pattern: "expo-file-system" },
  ],
  sellerLotFlow: [
    { name: "LotRestorePrompt", pattern: "LotRestorePrompt" },
    { name: "LotCreatePreviewFooter", pattern: "LotCreatePreviewFooter" },
    { name: "publishOnServer", pattern: "publishOnServer" },
    { name: "updateSellerLot", pattern: "updateSellerLot" },
  ],
};

const checks = [];
for (const [group, items] of Object.entries(symbolGroups)) {
  for (const item of items) {
    const present = bundleContains(item.pattern);
    checks.push({ group, name: item.name, pattern: item.pattern, present, ok: present });
  }
}

const legacyBrokenPatterns = [
  { name: "legacyUriFormDataCast", pattern: "as unknown as Blob" },
  { name: "legacyUriLocalUri", pattern: "uri: localUri" },
];
const legacyChecks = legacyBrokenPatterns.map((item) => {
  const present = bundleContains(item.pattern);
  return { ...item, present, ok: !present };
});

const commitShort = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const commitInBundle = bundleContains(commitShort) ? commitShort : "missing";

const identityChecks = [
  { name: "versionName", ok: identity.versionName === "0.1.15-beta.2", expected: "0.1.15-beta.2", actual: identity.versionName },
  { name: "versionCode", ok: identity.versionCode === "17", expected: "17", actual: identity.versionCode },
  { name: "package", ok: identity.package === "ru.lot.marketplace.alpha", expected: "ru.lot.marketplace.alpha", actual: identity.package },
  { name: "abi", ok: identity.nativeCode?.includes("arm64-v8a"), expected: "arm64-v8a", actual: identity.nativeCode },
  { name: "rc10_1Label", ok: bundleContains("RC10.1"), expected: "RC10.1 in bundle", actual: bundleContains("RC10.1") ? "present" : "missing" },
  { name: "stagingUrl", ok: bundleContains("web-production-e56fb"), expected: "staging URL", actual: bundleContains("web-production-e56fb") ? "present" : "missing" },
  { name: "closedBeta", ok: bundleContains("CLOSED_BETA"), expected: "CLOSED_BETA", actual: bundleContains("CLOSED_BETA") ? "present" : "missing" },
  { name: "commitSha", ok: commitInBundle !== "missing", expected: "commit SHA in bundle", actual: commitInBundle },
];

const failed = checks.filter((c) => !c.ok).concat(legacyChecks.filter((c) => !c.ok)).concat(identityChecks.filter((c) => !c.ok));
const report = {
  generatedAt: new Date().toISOString(),
  apkPath: fullPath,
  identity,
  identityChecks,
  symbolChecks: checks,
  legacyAbsentChecks: legacyChecks,
  evidenceNote: "APK bundle symbol presence only — not physical PASS",
  failed: failed.map((f) => f.name),
  verdict: failed.length === 0 ? "PASS" : "FAIL",
};

mkdirSync(resolve("artifacts/closed-beta-rc10.1"), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verdict: report.verdict, failed: report.failed, identity }, null, 2));
process.exit(report.verdict === "PASS" ? 0 : 1);
