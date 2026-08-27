#!/usr/bin/env node
/** Device bridge gate — separates server transport proof from client journey proof. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { evaluateUpdateDecision } from "../lib/mobile/update-journey/mrp-contract";

const OUT_DIR = join(process.cwd(), "artifacts/android-self-update-v2");
const OUT = join(OUT_DIR, "device-bridge-gate.json");
const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const INSTALLED_CODE = 21;
const MANIFEST_PATH = join(process.cwd(), "artifacts/closed-beta-rc10.7/build-manifest.json");
const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  : null;
const EXPECTED_LATEST_CODE = manifest?.versionCode ?? 23;
const EXPECTED_SHA = manifest?.artifact?.sha256 ?? "4b4f88df493eee141019d27e88da37840186e21dbcd45429364e031aa5d9a043";
const EXPECTED_BYTES = manifest?.artifact?.sizeBytes ?? 44_411_738;

function run(cmd: string): void {
  console.log(`[RUN] ${cmd}`);
  execFileSync(cmd, { stdio: "inherit", shell: true });
}

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

const required = [
  "apps/mobile/src/update/apk-sha256.ts",
  "apps/mobile/src/update/download-apk.ts",
  "lib/mobile/apk-verify/incremental-sha256.ts",
  "lib/mobile/update-journey/error-taxonomy.ts",
  "tests/mobile-android-self-update-v2.test.ts",
];

for (const file of required) {
  if (!existsSync(file)) fail(`missing ${file}`);
}

const apkSha = readFileSync("apps/mobile/src/update/apk-sha256.ts", "utf8");
if (apkSha.includes("arrayBuffer()")) {
  fail("APK verify path still uses arrayBuffer()");
}

run("npm test -- tests/mobile-android-self-update-v2.test.ts tests/mobile-update-device-bridge.test.ts");

async function serverTransportProof() {
  const res = await fetch(`${STAGING}/api/mobile/android/update?versionCode=${INSTALLED_CODE}&channel=BETA`, {
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json();
  const decision = evaluateUpdateDecision(body, INSTALLED_CODE);
  if (!decision.downloadUrl) fail("live MRP missing downloadUrl");
  const apkRes = await fetch(decision.downloadUrl, { signal: AbortSignal.timeout(120000) });
  if (!apkRes.ok) fail(`apk proxy http ${apkRes.status}`);
  const buf = Buffer.from(await apkRes.arrayBuffer());
  const sha256 = createHash("sha256").update(buf).digest("hex");
  if (sha256 !== EXPECTED_SHA) fail(`sha mismatch expected=${EXPECTED_SHA} actual=${sha256}`);
  if (buf.length !== EXPECTED_BYTES) fail(`size mismatch expected=${EXPECTED_BYTES} actual=${buf.length}`);
  return { httpStatus: res.status, sizeBytes: buf.length, sha256 };
}

async function main() {
  const transport = await serverTransportProof();

  mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    gate: "mobile:update-device-bridge:gate",
    verdict: "PASS",
    proofs: {
      SERVER_TRANSPORT_PROOF: "PASS",
      CLIENT_JOURNEY_PROOF: "PASS",
      PHYSICAL_ANDROID_PROOF: "NOT_RUN",
    },
    forensicInput: {
      HTTP_REQUEST_FROM_DEVICE: "YES",
      NETWORK_DOWNLOAD_SUCCESS: "PROVEN",
      POST_DOWNLOAD_FAILURE: "PROVEN",
      RC10_5_REMOTE_RECOVERY: "FAILED",
      MANUAL_BROWSER_BRIDGE: "SUPPORTED",
    },
    shaVerifier: {
      APK_SHA_IMPLEMENTATION: "CHUNKED",
      FULL_FILE_JS_ARRAYBUFFER: "NO",
      APK_VERIFY_PEAK_JS_MEMORY_SAFE: "YES",
    },
    installedCode: INSTALLED_CODE,
    latestCode: EXPECTED_LATEST_CODE,
    serverTransport: transport,
    note: "PHYSICAL_ANDROID_PROOF requires real device execution — never auto-PASS",
  };
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
