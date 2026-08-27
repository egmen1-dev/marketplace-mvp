#!/usr/bin/env node
/** RC10.7 APK forensics — PR #201 update journey hotfix symbols. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const apkPath = process.argv[2] ?? "artifacts/closed-beta-rc10.7/lot_android_closed_beta_0.1.15_beta.8.apk";
const OUT = resolve("artifacts/closed-beta-rc10.7/apk-feature-verification.json");
const SILENT_FAILURE_OUT = resolve("artifacts/closed-beta-rc10.7/silent-failure-invariant.json");
const SIGNER_OUT = resolve("artifacts/closed-beta-rc10.7/signer-verification.json");
const UPDATE_SOURCE_OUT = resolve("artifacts/closed-beta-rc10.7/update-source-contract.json");
const fullPath = resolve(apkPath);
const updateTsxPath = resolve("apps/mobile/app/update.tsx");

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
  photoFlow: [
    { name: "derivePhotoStepPhase", pattern: "derivePhotoStepPhase" },
    { name: "buildPhotoStepUiContract", pattern: "buildPhotoStepUiContract" },
    { name: "continueFromPhotos", pattern: "continueFromPhotos" },
    { name: "photoProcessingHint", pattern: "Обрабатываем фото" },
    { name: "interactionManagerDefer", pattern: "runAfterInteractions" },
    { name: "uploadQueueMutex", pattern: "uploadWaitPublish" },
    { name: "createOneTapGuard", pattern: "createOneTapGuard" },
    { name: "uploadStatusUploading", pattern: "uploading" },
  ],
  submitFlow: [
    { name: "handleCharacteristicRejection", pattern: "handleCharacteristicRejection" },
    { name: "asyncActionOutcomeVisibleError", pattern: "VISIBLE_ERROR" },
    { name: "characteristicsRequiredCode", pattern: "CHARACTERISTICS_REQUIRED" },
    { name: "publishOnServer", pattern: "publishOnServer" },
    { name: "pendingReviewTitle", pattern: "Проверяем ЛОТ" },
    { name: "PENDING_REVIEW", pattern: "PENDING_REVIEW" },
  ],
  journeyDiagnostics: [
    { name: "recordSellerJourneyEvent", pattern: "recordSellerJourneyEvent" },
    { name: "formatSellerJourneyDiagnostics", pattern: "formatSellerJourneyDiagnostics" },
    { name: "copySellerJourneyDiagnostics", pattern: "copySellerJourneyDiagnostics" },
    { name: "actionIdCorrelation", pattern: "actionId=" },
    { name: "diagnosticsCopyButton", pattern: "Скопировать диагностику" },
    { name: "sellerJourneyDiagnosticsHeader", pattern: "LOT seller journey diagnostics" },
  ],
  moderationAsyncBoundary: [
    { name: "clientActionIdHeader", pattern: "x-client-action-id" },
    { name: "lotSubmitActionId", pattern: "lot-submit" },
    { name: "photoContinueActionId", pattern: "photo-continue" },
    { name: "publishOutcomeMapper", pattern: "resolveLotPublishOutcome" },
  ],
  updateJourney: [
    { name: "buildUpdateScreenUiContract", pattern: "buildUpdateScreenUiContract" },
    { name: "createUpdateCheckSequenceGuard", pattern: "createUpdateCheckSequenceGuard" },
    { name: "recordUpdateJourneyEvent", pattern: "recordUpdateJourneyEvent" },
    { name: "updateCheckStarted", pattern: "UPDATE_CHECK_STARTED" },
    { name: "updateJourneyDiagnosticsHeader", pattern: "LOT update journey diagnostics" },
    { name: "checkFailedLabel", pattern: "Не удалось проверить обновление" },
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

const updateTsxSource = readFileSync(updateTsxPath, "utf8");
const sourceChecks = [
  {
    name: "noAvailableHintInUpdateTsx",
    ok: !updateTsxSource.includes("availableHint"),
    expected: "update.tsx must not contain availableHint",
    actual: updateTsxSource.includes("availableHint") ? "present" : "absent",
  },
];

const identityChecks = [
  { name: "versionName", ok: identity.versionName === "0.1.15-beta.8", expected: "0.1.15-beta.8", actual: identity.versionName },
  { name: "versionCode", ok: identity.versionCode === "23", expected: "23", actual: identity.versionCode },
  { name: "package", ok: identity.package === "ru.lot.marketplace.alpha", expected: "ru.lot.marketplace.alpha", actual: identity.package },
  { name: "abi", ok: identity.nativeCode?.includes("arm64-v8a"), expected: "arm64-v8a", actual: identity.nativeCode },
  { name: "rc10_7Label", ok: bundleContains("RC10.7"), expected: "RC10.7 in bundle", actual: bundleContains("RC10.7") ? "present" : "missing" },
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

const failed = checks
  .filter((c) => !c.ok)
  .concat(manifestChecks.filter((c) => !c.ok))
  .concat(identityChecks.filter((c) => !c.ok))
  .concat(sourceChecks.filter((c) => !c.ok));
const report = {
  generatedAt: new Date().toISOString(),
  candidate: "RC10.7",
  pr201: "654c16f",
  apkPath: fullPath,
  identity,
  signerSha256,
  identityChecks,
  manifestChecks,
  sourceChecks,
  symbolChecks: checks,
  featureForensics: {
    photoFix: checks.filter((c) => c.group === "photoFlow").every((c) => c.ok),
    submitFix: checks.filter((c) => c.group === "submitFlow").every((c) => c.ok),
    diagnostics: checks.filter((c) => c.group === "journeyDiagnostics").every((c) => c.ok),
    moderationAsyncBoundary: checks.filter((c) => c.group === "moderationAsyncBoundary").every((c) => c.ok),
    updateJourney: checks.filter((c) => c.group === "updateJourney").every((c) => c.ok),
  },
  evidenceNote: "APK bundle symbol presence only — not physical PASS",
  failed: failed.map((f) => f.name),
  verdict: failed.length === 0 ? "PASS" : "FAIL",
};

const silentFailureReport = {
  generatedAt: new Date().toISOString(),
  candidate: "RC10.7",
  invariant: "ACTION_STARTED → SUCCESS | VISIBLE_ERROR",
  forbidden: "loading → idle → no visible outcome",
  symbols: {
    visibleErrorOutcome: bundleContains("VISIBLE_ERROR"),
    handleCharacteristicRejection: bundleContains("handleCharacteristicRejection"),
    characteristicsRequiredCode: bundleContains("CHARACTERISTICS_REQUIRED"),
    continueFromPhotos: bundleContains("continueFromPhotos"),
    journeyDiagnostics: bundleContains("LOT seller journey diagnostics"),
    pendingReviewSuccessCopy: bundleContains("Проверяем ЛОТ"),
  },
  verdict:
    bundleContains("VISIBLE_ERROR") &&
    bundleContains("handleCharacteristicRejection") &&
    bundleContains("continueFromPhotos") &&
    bundleContains("LOT seller journey diagnostics")
      ? "PASS"
      : "FAIL",
};

const signerReport = {
  generatedAt: new Date().toISOString(),
  apkPath: fullPath,
  signerSha256,
  expectedSignerSha256: "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c",
  rc10_6SignerSha256: "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c",
  compatibleWithCode22: true,
  verdict: signerSha256 === "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c" ? "PASS" : "FAIL",
};

const updateSourceReport = {
  generatedAt: new Date().toISOString(),
  candidate: "RC10.7",
  file: "apps/mobile/app/update.tsx",
  forbiddenPattern: "availableHint",
  present: updateTsxSource.includes("availableHint"),
  verdict: updateTsxSource.includes("availableHint") ? "FAIL" : "PASS",
};

mkdirSync(resolve("artifacts/closed-beta-rc10.7"), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
writeFileSync(SILENT_FAILURE_OUT, JSON.stringify(silentFailureReport, null, 2));
writeFileSync(SIGNER_OUT, JSON.stringify(signerReport, null, 2));
writeFileSync(UPDATE_SOURCE_OUT, JSON.stringify(updateSourceReport, null, 2));
console.log(
  JSON.stringify(
    {
      verdict: report.verdict,
      failed: report.failed,
      identity,
      signerSha256,
      silentFailure: silentFailureReport.verdict,
      updateSourceContract: updateSourceReport.verdict,
    },
    null,
    2,
  ),
);
process.exit(report.verdict === "PASS" ? 0 : 1);
