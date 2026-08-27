#!/usr/bin/env node
/** PRE_PHYSICAL_V3 — blocks next RC build until software gates pass. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "artifacts/android-self-update-v2");
const OUT = join(OUT_DIR, "pre-physical-v3.json");

function run(cmd: string): void {
  console.log(`[RUN] ${cmd}`);
  execFileSync(cmd, { stdio: "inherit", shell: true });
}

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

const gates: Array<{ id: string; cmd: string }> = [
  { id: "build", cmd: "npm run build" },
  { id: "mobile_typecheck", cmd: "npm run mobile:typecheck" },
  { id: "update_journey", cmd: "npm run mobile:update-journey:gate" },
  { id: "android_update_install", cmd: "npm run mobile:android-update-install:gate" },
  { id: "update_device_bridge", cmd: "npm run mobile:update-device-bridge:gate" },
  { id: "seller_journey", cmd: "npm run mobile:seller-journey:gate" },
  { id: "create_lot_preview", cmd: "npm run mobile:create-lot-preview:gate" },
  { id: "lot_publish_truth", cmd: "npm run mobile:lot-publish-truth:gate" },
  { id: "my_lots_consistency", cmd: "npm run mobile:my-lots-consistency:gate" },
  { id: "seller_photo_upload", cmd: "npm run mobile:seller-photo-upload:gate" },
  { id: "lot_moderation", cmd: "npm run mobile:lot-moderation:gate" },
  { id: "backend_stability", cmd: "npm run staging:backend-stability:gate" },
  { id: "migration_verify", cmd: "npm run release:migration:verify" },
  { id: "railway_runtime", cmd: "npm run release:railway-runtime:verify" },
  { id: "release_pipeline", cmd: "npm run release:pipeline:verify" },
];

const results: Array<{ id: string; verdict: string }> = [];

for (const gate of gates) {
  try {
    run(gate.cmd);
    results.push({ id: gate.id, verdict: "PASS" });
  } catch {
    results.push({ id: gate.id, verdict: "FAIL" });
    fail(`pre-physical v3 gate failed: ${gate.id}`);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  gate: "mobile:pre-physical:v3",
  PRE_PHYSICAL_V3: "PASS",
  allows: "READY_FOR_NEXT_PHYSICAL_BUILD",
  blocks: "BLOCKED_PRE_PHYSICAL_V3",
  physicalAndroid: "NOT_RUN",
  apkBuilt: "NOT_BUILT",
  mrp: "UNCHANGED",
  results,
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
