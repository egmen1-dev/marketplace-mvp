#!/usr/bin/env node
/** Static gate for Firebase Test Lab instrumentation harness. */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "artifacts/firebase-test-lab");
const MANIFEST = join(OUT, "build-manifest.json");
const APP_APK = join(OUT, "lot-under-test.apk");
const TEST_APK = join(OUT, "lot-instrumentation-tests.apk");

const REQUIRED_TESTS = [
  "FirebaseCriticalSellerJourneyTest.kt",
  "FirebaseSmartphonePreviewTest.kt",
  "FirebasePhotoContinueOneTapTest.kt",
  "FirebaseSubmitOutcomeTest.kt",
  "FirebaseMyLotsTest.kt",
  "FirebaseUpdateV2JourneyTest.kt",
  "FirebaseHistoricalRegressionsTest.kt",
];

const REQUIRED_SOURCES = [
  "apps/mobile/plugins/withFirebaseInstrumentation.js",
  "apps/mobile/instrumentation/androidTest/java/ru/lot/marketplace/alpha/test/FirebaseQaSupport.kt",
  "scripts/mobile-firebase-instrumentation-build.mjs",
  "docs/mobile/FIREBASE_TEST_LAB_INSTRUMENTATION.md",
];

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

for (const file of REQUIRED_SOURCES) {
  if (!existsSync(join(ROOT, file))) fail(`missing ${file}`);
}

for (const test of REQUIRED_TESTS) {
  const path = join(
    ROOT,
    "apps/mobile/instrumentation/androidTest/java/ru/lot/marketplace/alpha/test",
    test,
  );
  if (!existsSync(path)) fail(`missing test class ${test}`);
}

const forbiddenSecretPatterns = [
  /sk_live_/,
  /AKIA[0-9A-Z]{16}/,
  /BEGIN PRIVATE KEY/,
];

for (const test of REQUIRED_TESTS) {
  const content = readFileSync(
    join(ROOT, "apps/mobile/instrumentation/androidTest/java/ru/lot/marketplace/alpha/test", test),
    "utf8",
  );
  for (const pattern of forbiddenSecretPatterns) {
    if (pattern.test(content)) fail(`secret pattern in ${test}`);
  }
}

if (!existsSync(APP_APK)) fail(`APP APK missing — run npm run mobile:firebase-instrumentation:build`);
if (!existsSync(TEST_APK)) fail(`TEST APK missing — run npm run mobile:firebase-instrumentation:build`);

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
if (manifest.appPackage !== "ru.lot.marketplace.alpha") fail("app package mismatch");
if (manifest.testPackage !== "ru.lot.marketplace.alpha.test") fail("test package mismatch");
if (manifest.runner !== "androidx.test.runner.AndroidJUnitRunner") fail("runner mismatch");
if (manifest.estimatedInstrumentationMinutes > 20) fail("instrumentation runtime budget exceeded");

console.log("[RUN] npm test -- tests/mobile-firebase-instrumentation.test.ts");
execFileSync("npm test -- tests/mobile-firebase-instrumentation.test.ts", {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});

const report = {
  generatedAt: new Date().toISOString(),
  gate: "mobile:firebase-instrumentation:gate",
  verdict: "PASS",
  appApk: APP_APK,
  testApk: TEST_APK,
  ...manifest,
  historicalRegressionTests: REQUIRED_TESTS.length,
  virtualInstrumentation: existsSync(join(OUT, "virtual-result.json"))
    ? JSON.parse(readFileSync(join(OUT, "virtual-result.json"), "utf8"))
    : { result: "NOT_RUN" },
};

writeFileSync(join(OUT, "gate-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
