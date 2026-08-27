#!/usr/bin/env node
/** Canonical update journey gate — client state machine + live MRP contract. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { evaluateUpdateDecision } from "../lib/mobile/update-journey/mrp-contract";

const OUT_DIR = join(process.cwd(), "artifacts/mobile-update-journey");
const OUT = join(OUT_DIR, "gate-report.json");
const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const INSTALLED_CODE = 21;
const MANIFEST_PATH = join(process.cwd(), "artifacts/closed-beta-rc10.7/build-manifest.json");
const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  : null;
const EXPECTED_LATEST_CODE = manifest?.versionCode ?? 23;
const EXPECTED_SHA = manifest?.artifact?.sha256 ?? "4b4f88df493eee141019d27e88da37840186e21dbcd45429364e031aa5d9a043";

function run(cmd: string): void {
  console.log(`[RUN] ${cmd}`);
  execFileSync(cmd, { stdio: "inherit", shell: true });
}

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

const required = [
  "lib/mobile/update-journey/update-state.ts",
  "lib/mobile/update-journey/update-harness.ts",
  "lib/mobile/update-journey/mrp-contract.ts",
  "apps/mobile/src/hooks/useUpdateCheckFlow.ts",
  "apps/mobile/app/update.tsx",
  "apps/mobile/src/update/journey-diagnostics.ts",
  "tests/mobile-update-journey.test.ts",
];

for (const file of required) {
  if (!existsSync(file)) fail(`missing ${file}`);
}

run("npm test -- tests/mobile-update-journey.test.ts tests/mobile-android-self-update-v2.test.ts");

async function liveMrpContract() {
  const res = await fetch(`${STAGING}/api/mobile/android/update?versionCode=${INSTALLED_CODE}&channel=BETA`, {
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json();
  const decision = evaluateUpdateDecision(body, INSTALLED_CODE);
  if (decision.updateState !== "OPTIONAL_UPDATE" || decision.latestVersionCode !== EXPECTED_LATEST_CODE) {
    fail(`live MRP decision mismatch: ${JSON.stringify(decision)}`);
  }

  const url = decision.downloadUrl;
  if (!url) fail("live MRP missing downloadUrl");
  const buf = Buffer.from(await (await fetch(url, { signal: AbortSignal.timeout(120000) })).arrayBuffer());
  const sha256 = createHash("sha256").update(buf).digest("hex");
  if (sha256 !== EXPECTED_SHA) {
    fail(`canonical APK sha mismatch expected=${EXPECTED_SHA} actual=${sha256}`);
  }
  return { decision, httpStatus: res.status, sizeBytes: buf.length, sha256 };
}

async function main() {
  const live = await liveMrpContract();

  mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    gate: "mobile:update-journey:gate",
    verdict: "PASS",
    physicalAndroid: "NOT_RUN",
    installedCode: INSTALLED_CODE,
    latestCode: EXPECTED_LATEST_CODE,
    liveMrp: live,
    layers: {
      serverDecision: "PASS",
      artifactSha: "PASS",
      clientStateGate: "PASS",
      downloadGate: "PASS",
      physicalGate: "NOT_RUN",
    },
    updateMatrixClientEquivalentToRc105: "NO",
    gateGapNote:
      "Previous update matrix tested server API only; RC10.5 client had independent error/available booleans in update.tsx",
  };
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
