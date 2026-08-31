#!/usr/bin/env node
/** Attempt connectedDebugAndroidTest when an emulator/device is available. */
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "artifacts/firebase-test-lab");
const ANDROID = join(ROOT, "apps/mobile/android");
const RESULT = join(OUT, "virtual-result.json");

function hasDevice() {
  try {
    const out = execFileSync("adb devices", { encoding: "utf8", shell: true });
    return out.split("\n").some((line) => line.trim().endsWith("device") && !line.startsWith("List"));
  } catch {
    return false;
  }
}

if (!existsSync(join(OUT, "lot-under-test.apk"))) {
  console.error("[FAIL] Build APKs first: npm run mobile:firebase-instrumentation:build");
  process.exit(1);
}

let result = "NOT_RUN";
let detail = "No adb device/emulator detected";

if (hasDevice()) {
  try {
    execFileSync("./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.RUN_ID=firebase-qa-virtual-phone", {
      cwd: ANDROID,
      stdio: "inherit",
      shell: true,
      timeout: 25 * 60 * 1000,
    });
    result = "PASS";
    detail = "connectedDebugAndroidTest completed";
  } catch (err) {
    result = "FAIL";
    detail = err instanceof Error ? err.message : String(err);
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  VIRTUAL_INSTRUMENTATION_RESULT: result,
  detail,
};
writeFileSync(RESULT, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
if (result === "FAIL") process.exit(1);
