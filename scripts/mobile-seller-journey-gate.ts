#!/usr/bin/env node
/** Canonical seller journey gate — user-observable invariants without a physical device. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "artifacts/mobile-physical-gap");
const OUT = join(OUT_DIR, "seller-journey.json");

function run(cmd: string): void {
  console.log(`[RUN] ${cmd}`);
  execFileSync(cmd, { stdio: "inherit", shell: true });
}

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

const required = [
  "lib/mobile/seller-journey/photo-step-state.ts",
  "lib/mobile/seller-journey/submit-action-state.ts",
  "lib/mobile/seller-journey/journey-harness.ts",
  "apps/mobile/src/seller/journey-diagnostics.ts",
  "apps/mobile/src/seller/use-lot-create-form.ts",
  "apps/mobile/app/sell/create.tsx",
  "tests/mobile-seller-journey.test.ts",
];

for (const file of required) {
  if (!existsSync(file)) fail(`missing ${file}`);
}

run("npm test -- tests/mobile-seller-journey.test.ts");

mkdirSync(OUT_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  gate: "mobile:seller-journey:gate",
  verdict: "PASS",
  physicalAndroid: "NOT_RUN",
  technology: "vitest harness (lib/mobile/seller-journey)",
  mocked: ["network latency", "server responses"],
  real: ["photo step state machine", "submit outcome invariant", "one-tap guards", "wiring contracts"],
  limitations: ["No React Native touch layer", "No physical ImagePicker return"],
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
