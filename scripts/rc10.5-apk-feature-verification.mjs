#!/usr/bin/env node
/** RC10.5 APK forensics — My Lots + create/preview P0 fix symbols. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const apkPath = process.argv[2] ?? "artifacts/closed-beta-rc10.5/lot_android_closed_beta_0.1.15_beta.6.apk";
const OUT = resolve("artifacts/closed-beta-rc10.5/apk-feature-verification.json");
const fullPath = resolve(apkPath);

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function bundleContains(pattern) {
  try {
    const py = `import sys,zipfile; apk=sys.argv[1]; p=sys.argv[2]; z=zipfile.ZipFile(apk); b=z.read('assets/index.android.bundle'); sys.exit(0 if p.encode() in b or p.encode('utf-16-le') in b else 1)`;
    execFileSync("python3", ["-c", py, fullPath, pattern], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
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
  myLotsConsistency: [
    { name: "sellerSection", pattern: "sellerSection" },
    { name: "fetchSellerProducts", pattern: "fetchSellerProducts" },
    { name: "emptySearch", pattern: "По вашему запросу ничего не найдено" },
    { name: "emptyTab", pattern: "У вас пока нет ЛОТов" },
    { name: "pendingTab", pattern: "На проверке" },
  ],
  createPreviewFix: [
    { name: "evaluateLotPreviewValidation", pattern: "evaluateLotPreviewValidation" },
    { name: "canPreview", pattern: "canPreview" },
    { name: "previewBlockers", pattern: "previewBlockers" },
    { name: "selectCategory", pattern: "Выберите категорию" },
    { name: "selectProductType", pattern: "Выберите тип ЛОТа" },
    { name: "addPhoto", pattern: "Добавьте хотя бы 1 фотографию" },
  ],
  moderationUx: [
    { name: "pendingReviewTab", pattern: "На проверке" },
    { name: "checkingLot", pattern: "Проверяем ЛОТ" },
    { name: "PENDING_REVIEW", pattern: "PENDING_REVIEW" },
  ],
  androidUpdater: [
    { name: "downloadVerifiedApk", pattern: "downloadVerifiedApk" },
    { name: "openApkInstaller", pattern: "openApkInstall" },
  ],
};

const checks = [];
for (const [group, items] of Object.entries(symbolGroups)) {
  for (const item of items) {
    const present = bundleContains(item.pattern);
    checks.push({ group, name: item.name, pattern: item.pattern, present, ok: present });
  }
}

const manifestXml = run("aapt", ["dump", "xmltree", fullPath, "AndroidManifest.xml"]);
const manifestChecks = [
  { name: "requestInstallPackages", ok: manifestXml.includes("REQUEST_INSTALL_PACKAGES"), expected: "REQUEST_INSTALL_PACKAGES" },
];

let signerSha256 = "";
try {
  const out = run("apksigner", ["verify", "--print-certs", fullPath]);
  signerSha256 = out.match(/SHA-256 digest:\s*([a-f0-9]+)/i)?.[1]?.toLowerCase() ?? "";
} catch {
  signerSha256 = "";
}

const commitShort = (process.env.EXPO_PUBLIC_COMMIT_SHA ?? execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim()).slice(0, 7);
const commitInBundle = bundleContains(commitShort) ? commitShort : bundleContains("unknown") ? "unknown" : "missing";

const identityChecks = [
  { name: "versionName", ok: identity.versionName === "0.1.15-beta.6", expected: "0.1.15-beta.6", actual: identity.versionName },
  { name: "versionCode", ok: identity.versionCode === "21", expected: "21", actual: identity.versionCode },
  { name: "package", ok: identity.package === "ru.lot.marketplace.alpha", expected: "ru.lot.marketplace.alpha", actual: identity.package },
  { name: "abi", ok: identity.nativeCode?.includes("arm64-v8a"), expected: "arm64-v8a", actual: identity.nativeCode },
  { name: "rc10_5Label", ok: bundleContains("RC10.5"), expected: "RC10.5 in bundle", actual: bundleContains("RC10.5") ? "present" : "missing" },
  { name: "stagingUrl", ok: bundleContains("web-production-e56fb"), expected: "staging URL", actual: bundleContains("web-production-e56fb") ? "present" : "missing" },
  { name: "closedBeta", ok: bundleContains("CLOSED_BETA"), expected: "CLOSED_BETA", actual: bundleContains("CLOSED_BETA") ? "present" : "missing" },
  { name: "commitSha", ok: commitInBundle !== "missing", expected: "commit SHA in bundle", actual: commitInBundle },
  {
    name: "signerSha256",
    ok: signerSha256 === "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c",
    expected: "fac61745…",
    actual: signerSha256 ? `${signerSha256.slice(0, 16)}…` : "missing",
  },
];

const failed = checks.filter((c) => !c.ok).concat(manifestChecks.filter((c) => !c.ok)).concat(identityChecks.filter((c) => !c.ok));
const report = {
  generatedAt: new Date().toISOString(),
  apkPath: fullPath,
  identity,
  signerSha256,
  identityChecks,
  manifestChecks,
  symbolChecks: checks,
  evidenceNote: "APK bundle symbol presence only — not physical PASS",
  failed: failed.map((f) => f.name),
  verdict: failed.length === 0 ? "PASS" : "FAIL",
};

mkdirSync(resolve("artifacts/closed-beta-rc10.5"), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verdict: report.verdict, failed: report.failed, identity, signerSha256 }, null, 2));
process.exit(report.verdict === "PASS" ? 0 : 1);
