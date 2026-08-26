#!/usr/bin/env node
/** PRE_PHYSICAL_V2 — blocks READY_FOR_PHYSICAL_VALIDATION without journey coverage. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "artifacts/mobile-physical-gap");
const OUT = join(OUT_DIR, "pre-physical-gate.json");

function run(cmd: string): void {
  console.log(`[RUN] ${cmd}`);
  execFileSync(cmd, { stdio: "inherit", shell: true });
}

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

if (!existsSync("artifacts/mobile-physical-gap/gate-gap-analysis.json")) {
  fail("missing gate-gap-analysis.json — run artifact bootstrap first");
}

const gates: Array<{ id: string; cmd: string }> = [
  { id: "seller_journey", cmd: "npm run mobile:seller-journey:gate" },
  { id: "create_lot_preview", cmd: "npm run mobile:create-lot-preview:gate" },
  { id: "my_lots_consistency", cmd: "npm run mobile:my-lots-consistency:gate" },
  { id: "lot_publish_truth", cmd: "npm run mobile:lot-publish-truth:gate" },
  { id: "lot_dynamic_characteristics", cmd: "npm run mobile:lot-dynamic-characteristics:gate" },
  { id: "lot_moderation", cmd: "npm run mobile:lot-moderation:gate" },
  { id: "seller_photo_upload", cmd: "npm run mobile:seller-photo-upload:gate" },
  { id: "backend_stability", cmd: "npm run staging:backend-stability:gate" },
  { id: "railway_runtime", cmd: "npm run release:railway-runtime:verify" },
  { id: "migration_verify", cmd: "npm run release:migration:verify" },
  { id: "release_pipeline", cmd: "npm run release:pipeline:verify" },
];

const results: Array<{ id: string; verdict: string }> = [];

for (const gate of gates) {
  try {
    run(gate.cmd);
    results.push({ id: gate.id, verdict: "PASS" });
  } catch {
    results.push({ id: gate.id, verdict: "FAIL" });
    fail(`pre-physical gate failed: ${gate.id}`);
  }
}

const gap = JSON.parse(readFileSync(join(OUT_DIR, "gate-gap-analysis.json"), "utf8"));

mkdirSync(OUT_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  gate: "mobile:pre-physical:gate",
  version: "PRE_PHYSICAL_V2",
  verdict: "PASS",
  allows: "READY_FOR_NEXT_PHYSICAL_BUILD",
  blocks: "BLOCKED_BEFORE_DEVICE",
  physicalAndroid: "NOT_RUN",
  gapAnalysisRef: gap.summary,
  results,
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
