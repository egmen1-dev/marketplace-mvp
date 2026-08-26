#!/usr/bin/env node
/** RC10.5 — combined physical regression gate (automated invariants only). */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "artifacts/closed-beta-rc10.5");
const OUT = join(OUT_DIR, "gate-results.json");

function run(cmd: string): void {
  console.log(`[RUN] ${cmd}`);
  execFileSync(cmd, { stdio: "inherit", shell: true });
}

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

const requiredFiles = [
  "lib/mobile/seller-lots-section.ts",
  "lib/mobile/lot-preview-validation.ts",
  "apps/mobile/src/seller/use-seller-products-list.ts",
  "scripts/mobile-my-lots-consistency-gate.ts",
  "scripts/mobile-create-lot-preview-gate.ts",
];

for (const file of requiredFiles) {
  if (!existsSync(file)) fail(`missing required fix file: ${file}`);
}

const gates: Array<{ id: string; cmd: string }> = [
  { id: "build", cmd: "npm run build" },
  { id: "mobile_typecheck", cmd: "cd apps/mobile && npm run typecheck" },
  { id: "create_lot_preview", cmd: "npm run mobile:create-lot-preview:gate" },
  { id: "my_lots_consistency", cmd: "npm run mobile:my-lots-consistency:gate" },
  { id: "lot_publish_truth", cmd: "npm run mobile:lot-publish-truth:gate" },
  { id: "lot_dynamic_characteristics", cmd: "npm run mobile:lot-dynamic-characteristics:gate" },
  { id: "lot_moderation", cmd: "npm run mobile:lot-moderation:gate" },
  { id: "seller_photo_upload", cmd: "npm run mobile:seller-photo-upload:gate" },
  { id: "policy_v2", cmd: "npm run moderation:policy-v2:gate" },
  { id: "image_ocr", cmd: "npm run moderation:image-ocr:gate" },
  { id: "backend_stability", cmd: "npm run staging:backend-stability:gate" },
  { id: "railway_runtime", cmd: "npm run release:railway-runtime:verify" },
  { id: "migration_verify", cmd: "npm run release:migration:verify" },
  { id: "release_pipeline", cmd: "npm run release:pipeline:verify" },
];

const unitTests = [
  "tests/mobile-lot-preview-validation.test.ts",
  "tests/mobile-lot-draft-autosave.test.ts",
  "tests/mobile-my-lots-consistency.test.ts",
  "tests/seller-lots-section.test.ts",
];

const results: Array<{ id: string; verdict: string }> = [];

for (const test of unitTests) {
  const id = `unit_${test.replace(/\W+/g, "_")}`;
  run(`npm test -- ${test}`);
  results.push({ id, verdict: "PASS" });
}

for (const gate of gates) {
  try {
    run(gate.cmd);
    results.push({ id: gate.id, verdict: "PASS" });
  } catch {
    results.push({ id: gate.id, verdict: "FAIL" });
    fail(`gate failed: ${gate.id}`);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  candidate: "RC10.5",
  verdict: "PASS",
  physicalAndroid: "NOT_RUN",
  results,
  invariants: [
    "smartphone_preview_reachable",
    "preview_blockers_explicit",
    "characteristics_submit_boundary",
    "seller_section_exclusivity",
    "request_sequencing",
    "server_search_contract",
    "policy_regression",
    "autosave_roundtrip",
  ],
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
