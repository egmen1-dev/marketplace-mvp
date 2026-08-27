const fs = require("fs");
const path = require("path");
const {
  withAppBuildGradle,
  withDangerousMod,
  AndroidConfig,
} = require("@expo/config-plugins");

const APP_PACKAGE = "ru.lot.marketplace.alpha";
const TEST_PACKAGE = `${APP_PACKAGE}.test`;
const RUNNER = "androidx.test.runner.AndroidJUnitRunner";

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function patchAppBuildGradle(contents) {
  let next = contents;
  if (!next.includes("testApplicationId")) {
    next = next.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {
        testApplicationId "${TEST_PACKAGE}"
        testInstrumentationRunner "${RUNNER}"`,
    );
  }
  const deps = `
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:rules:1.6.2")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.test.uiautomator:uiautomator:2.3.0")
    androidTestImplementation("com.squareup.okhttp3:okhttp:4.12.0")`;
  if (!next.includes("androidTestImplementation")) {
    next = next.replace(/dependencies\s*\{/, `dependencies {${deps}`);
  }
  return next;
}

function withFirebaseInstrumentation(config) {
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = patchAppBuildGradle(config.modResults.contents);
    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = path.join(projectRoot, "android");
      const instrumentationRoot = path.join(projectRoot, "instrumentation");
      const androidTestDest = path.join(androidRoot, "app", "src", "androidTest");
      const javaDest = path.join(androidTestDest, "java", "ru", "lot", "marketplace", "alpha", "test");
      const assetsDest = path.join(androidTestDest, "assets");

      fs.mkdirSync(javaDest, { recursive: true });
      fs.mkdirSync(assetsDest, { recursive: true });

      copyDirRecursive(path.join(instrumentationRoot, "androidTest", "java"), javaDest);
      copyDirRecursive(path.join(instrumentationRoot, "fixtures"), assetsDest);

      const marker = path.join(androidTestDest, ".firebase-qa-synced");
      fs.writeFileSync(
        marker,
        JSON.stringify({ syncedAt: new Date().toISOString(), runner: RUNNER, testPackage: TEST_PACKAGE }, null, 2),
      );
      return config;
    },
  ]);

  return config;
}

module.exports = withFirebaseInstrumentation;
module.exports.APP_PACKAGE = APP_PACKAGE;
module.exports.TEST_PACKAGE = TEST_PACKAGE;
module.exports.RUNNER = RUNNER;
