#!/usr/bin/env node
/**
 * Build Firebase Test Lab APP APK + instrumentation TEST APK (QA harness only).
 * Does NOT publish MRP / RC — outputs artifacts/firebase-test-lab/.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MOBILE = join(ROOT, "apps/mobile");
const ANDROID = join(MOBILE, "android");
const OUT = join(ROOT, "artifacts/firebase-test-lab");
const APP_APK = join(OUT, "lot-under-test.apk");
const TEST_APK = join(OUT, "lot-instrumentation-tests.apk");
const MANIFEST = join(OUT, "build-manifest.json");

const APP_PACKAGE = "ru.lot.marketplace.alpha";
const TEST_PACKAGE = `${APP_PACKAGE}.test`;
const RUNNER = "androidx.test.runner.AndroidJUnitRunner";
const BUILD_VARIANT = "firebaseQa";
const ANDROID_SDK =
  process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? join(ROOT, ".android-sdk");

function run(cmd, cwd = ROOT, env = {}) {
  console.log(`[RUN] ${cmd}`);
  execFileSync(cmd, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ANDROID_HOME: ANDROID_SDK, ANDROID_SDK_ROOT: ANDROID_SDK, ...env },
  });
}

function ensureAndroidSdk() {
  if (!existsSync(ANDROID_SDK)) {
    fail(`Android SDK missing at ${ANDROID_SDK}`);
  }
  const localProps = join(ANDROID, "local.properties");
  writeFileSync(localProps, `sdk.dir=${ANDROID_SDK}\n`);
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

mkdirSync(OUT, { recursive: true });

const buildEnv = {
  EXPO_PUBLIC_FIREBASE_QA: "1",
  EXPO_PUBLIC_RELEASE_CHANNEL: "staging",
  EXPO_PUBLIC_FIREBASE_QA_RUN_ID: `firebase-qa-${Date.now()}-phone`,
};

run("npx expo prebuild --platform android --clean", MOBILE, buildEnv);

if (!existsSync(ANDROID)) fail("android folder missing after prebuild");
ensureAndroidSdk();

run(
  `./gradlew :app:assemble${capitalize(BUILD_VARIANT)} :app:assemble${capitalize(BUILD_VARIANT)}AndroidTest`,
  join(ANDROID),
  buildEnv,
);

const builtAppApk = join(ANDROID, `app/build/outputs/apk/${BUILD_VARIANT}/app-${BUILD_VARIANT}.apk`);
const builtTestApk = join(
  ANDROID,
  `app/build/outputs/apk/androidTest/${BUILD_VARIANT}/app-${BUILD_VARIANT}-androidTest.apk`,
);
if (!existsSync(builtAppApk)) fail(`missing app APK: ${builtAppApk}`);
if (!existsSync(builtTestApk)) fail(`missing test APK: ${builtTestApk}`);

copyFileSync(builtAppApk, APP_APK);
copyFileSync(builtTestApk, TEST_APK);

const manifest = {
  generatedAt: new Date().toISOString(),
  gate: "mobile:firebase-instrumentation:build",
  appApk: APP_APK,
  testApk: TEST_APK,
  appPackage: APP_PACKAGE,
  testPackage: TEST_PACKAGE,
  runner: RUNNER,
  appBytes: statSync(APP_APK).size,
  testBytes: statSync(TEST_APK).size,
  appSha256: sha256(APP_APK),
  testSha256: sha256(TEST_APK),
  buildVariant: BUILD_VARIANT,
  firebaseQa: true,
  releaseChannel: "staging",
  metroRequired: false,
  mrpPublished: false,
  rcCreated: false,
  estimatedInstrumentationMinutes: 18,
  estimatedRoboMinutes: 5,
  gcloudExample: [
    "gcloud firebase test android run",
    "  --type instrumentation",
    `  --app ${APP_APK}`,
    `  --test ${TEST_APK}`,
    "  --device model=redfin,version=30,locale=ru,orientation=portrait",
    "  --timeout 25m",
    `  --environment-variables RUN_ID=firebase-qa-manual-phone,clearPackageData=true`,
  ].join(" \\\n"),
};

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
