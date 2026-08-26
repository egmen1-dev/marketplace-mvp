#!/usr/bin/env node
/** LOT_POLICY_V2 acceptance gate — registry, fixtures, false-positive/negative thresholds */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { evaluateLotPolicyV2 } from "@/lib/moderation/policy-v2/evaluate";
import { loadLotPolicyV2Registry } from "@/lib/moderation/policy-v2/load-registry";
import { automationVerdict, canAutoApprove } from "@/lib/moderation/policy-v2/safe-auto-approval";
import { isImageModerationOperational, isOcrOperational } from "@/lib/moderation/providers";

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

const requiredDocs = [
  "docs/product/LOT_MARKETPLACE_POLICY_RESEARCH.md",
  "docs/product/LOT_POLICY_V2_ARCHITECTURE.md",
];

for (const doc of requiredDocs) {
  if (!existsSync(doc)) fail(`missing ${doc}`);
}

if (!existsSync("config/policies/lot-policy-v2.json")) {
  fail("missing config/policies/lot-policy-v2.json");
}

const registry = loadLotPolicyV2Registry();
if (registry.rules.length < 40) fail(`expected >= 40 rules, got ${registry.rules.length}`);

for (const rule of registry.rules) {
  if (!rule.policyId || !rule.decisionClass) fail(`invalid rule ${rule.policyId ?? "?"}`);
  if (rule.jurisdiction !== "RU") fail(`rule ${rule.policyId} missing RU jurisdiction`);
}

const fixtures = JSON.parse(
  readFileSync("tests/fixtures/policy-v2/fixtures.json", "utf8"),
) as { count: number; fixtures: Array<{ id: string; expected: string; input: Record<string, unknown>; tags: string[] }> };

if (fixtures.count < 100) fail(`expected >= 100 fixtures, got ${fixtures.count}`);

let falsePositive = 0;
let falseNegative = 0;
const mismatches = [];

for (const fx of fixtures.fixtures) {
  const result = evaluateLotPolicyV2(fx.input as Parameters<typeof evaluateLotPolicyV2>[0]);
  if (result.decisionClass !== fx.expected) {
    mismatches.push(`${fx.id}: expected ${fx.expected}, got ${result.decisionClass}`);
    if (fx.tags.includes("false-positive")) falsePositive++;
    if (fx.tags.includes("false-negative")) falseNegative++;
  }
}

if (mismatches.length > 0) {
  console.error(mismatches.slice(0, 15).join("\n"));
  fail(`${mismatches.length} fixture mismatches (fp=${falsePositive}, fn=${falseNegative})`);
}

const vapeCase = evaluateLotPolicyV2({
  title: "Жидкость для вэйпа",
  description: "фруктовый вкус",
  imageUrls: ["/staging/vape-liquid.jpg"],
});
if (vapeCase.decisionClass !== "MANUAL_REVIEW") {
  fail(`vape case expected MANUAL_REVIEW, got ${vapeCase.decisionClass}`);
}

console.log("[RUN] vitest moderation-policy-v2");
execFileSync("npm", ["test", "--", "tests/moderation-policy-v2.test.ts"], { stdio: "inherit" });

const verdict = automationVerdict({
  policyResearchComplete: true,
  imageEngineOperational: isImageModerationOperational(),
  ocrOperational: isOcrOperational(),
  criticalFalseNegatives: falseNegative,
});

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      automationVerdict: verdict,
      policyVersion: registry.version,
      ruleCount: registry.rules.length,
      fixtureCount: fixtures.count,
      falsePositives: falsePositive,
      falseNegatives: falseNegative,
      vapeCase: vapeCase.decisionClass,
      imageEngine: isImageModerationOperational() ? "PIXEL_OCR_QR_OPERATIONAL" : "UNAVAILABLE",
      ocr: isOcrOperational() ? "TESSERACT_PIXEL" : "UNAVAILABLE",
      shadowMode: "LOT_POLICY_V2_SHADOW default enabled",
      rc105: "BLOCKED",
    },
    null,
    2,
  ),
);
