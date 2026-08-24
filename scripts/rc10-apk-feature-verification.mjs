#!/usr/bin/env node
/** RC10 APK forensics — verify bundle contains EPIC 158.1–158.3 + 159 symbols (presence only). */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const apkPath = process.argv[2] ?? "artifacts/closed-beta-rc10/lot_android_closed_beta_0.1.15_beta.1.apk";
const OUT = resolve("artifacts/closed-beta-rc10/apk-feature-verification.json");
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
  epic158_1_lotUxHardening: [
    { name: "createSellerLot", pattern: "createSellerLot" },
    { name: "sellCreateRoute", pattern: "/sell/create" },
    { name: "lotDraftV2", pattern: "lot-draft-v2" },
    { name: "restoreLotPrompt", pattern: "LotRestorePrompt" },
    { name: "fetchSellerPickupPoints", pattern: "fetchSellerPickupPoints" },
    { name: "saveLotAction", pattern: "saveLotLocallyAndServer" },
  ],
  epic158_2_sellerUxSimplify: [
    { name: "restoreTitleKey", pattern: "restoreTitle" },
    { name: "lotCreateStickyFooter", pattern: "LotCreateStickyFooter" },
    { name: "ctaPrimary", pattern: "ctaPrimary" },
    { name: "humanPublishError", pattern: "publishError" },
    { name: "formdatapart", pattern: "formdatapart" },
  ],
  epic158_3_previewUpdate: [
    { name: "previewTitleKey", pattern: "previewTitle" },
    { name: "previewFooter", pattern: "LotCreatePreviewFooter" },
    { name: "useUpdateCheck", pattern: "useUpdateCheck" },
    { name: "updateUiLabels", pattern: "UPDATE_UI_LABELS" },
    { name: "updateRoute", pattern: "/update" },
    { name: "fetchMobileUpdate", pattern: "fetchMobileUpdate" },
  ],
  epic159_sellerBetaAcceptance: [
    { name: "updateSellerLot", pattern: "updateSellerLot" },
    { name: "publishSellerLot", pattern: "publishSellerLot" },
    { name: "publishOnServer", pattern: "publishOnServer" },
    { name: "successTitleKey", pattern: "successTitle" },
    { name: "successBodyKey", pattern: "successBody" },
    { name: "createAnotherKey", pattern: "createAnother" },
  ],
  epic152_sellerLoop: [
    { name: "fetchSellerOrders", pattern: "fetchSellerOrders" },
    { name: "sellerSalesScreen", pattern: "seller-sales" },
    { name: "buildBuyerOrderTimeline", pattern: "buildBuyerOrderTimeline" },
  ],
  epic154_criticalPath: [
    { name: "useCheckoutReturnRefresh", pattern: "useCheckoutReturnRefresh" },
    { name: "sellerTrustBlock", pattern: "trustBlock" },
  ],
};

const checks = [];
for (const [group, items] of Object.entries(symbolGroups)) {
  for (const item of items) {
    const present = bundleContains(item.pattern);
    checks.push({ group, name: item.name, pattern: item.pattern, present, ok: present });
  }
}

const commitShort = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const commitInBundle = bundleContains(commitShort) ? commitShort : "missing";

const identityChecks = [
  { name: "versionName", ok: identity.versionName === "0.1.15-beta.1", expected: "0.1.15-beta.1", actual: identity.versionName },
  { name: "versionCode", ok: identity.versionCode === "16", expected: "16", actual: identity.versionCode },
  { name: "package", ok: identity.package === "ru.lot.marketplace.alpha", expected: "ru.lot.marketplace.alpha", actual: identity.package },
  { name: "abi", ok: identity.nativeCode?.includes("arm64-v8a"), expected: "arm64-v8a", actual: identity.nativeCode },
  { name: "rc10Label", ok: bundleContains("RC10"), expected: "RC10 in bundle", actual: bundleContains("RC10") ? "present" : "missing" },
  { name: "stagingUrl", ok: bundleContains("web-production-e56fb"), expected: "staging URL", actual: bundleContains("web-production-e56fb") ? "present" : "missing" },
  { name: "closedBeta", ok: bundleContains("CLOSED_BETA"), expected: "CLOSED_BETA", actual: bundleContains("CLOSED_BETA") ? "present" : "missing" },
  { name: "commitSha", ok: commitInBundle !== "missing", expected: "commit SHA in bundle", actual: commitInBundle },
];

const failed = checks.filter((c) => !c.ok).concat(identityChecks.filter((c) => !c.ok));
const report = {
  generatedAt: new Date().toISOString(),
  apkPath: fullPath,
  identity,
  identityChecks,
  symbolChecks: checks,
  evidenceNote: "APK bundle symbol presence only — not physical PASS",
  failed: failed.map((f) => f.name),
  verdict: failed.length === 0 ? "PASS" : "FAIL",
};

mkdirSync(resolve("artifacts/closed-beta-rc10"), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verdict: report.verdict, failed: report.failed, identity }, null, 2));
process.exit(report.verdict === "PASS" ? 0 : 1);
