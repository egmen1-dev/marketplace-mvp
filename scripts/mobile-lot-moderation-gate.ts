#!/usr/bin/env node
/** EPIC 174 — LOT moderation gate */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

const requiredDocs = [
  "docs/product/EPIC_174_MODERATION_ARCHITECTURE_AUDIT.md",
  "docs/product/EPIC_174_MODERATION_POLICY_V1.md",
  "docs/product/EPIC_174_MODERATION_OPERATIONS.md",
  "docs/mobile/EPIC_174_PHYSICAL_ACCEPTANCE.md",
];

for (const doc of requiredDocs) {
  if (!existsSync(doc)) {
    console.error(`[FAIL] missing ${doc}`);
    process.exit(1);
  }
}

console.log("[RUN] vitest mobile-lot-moderation");
run("npm", ["test", "--", "tests/mobile-lot-moderation.test.ts"]);

const engine = readFileSync("lib/moderation/lifecycle.ts", "utf8");
if (!engine.includes("submitLotForModeration") || !engine.includes("applyAdminModerationDecision")) {
  console.error("[FAIL] moderation lifecycle incomplete");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      verdict: "READY_FOR_STAGING_RETEST",
      automationMode: process.env.MODERATION_AUTOMATION_MODE ?? "SHADOW",
      imageModeration: "NOT_EVALUATED",
      ocr: "NOT_EVALUATED",
      apkBuild: "NOT_RUN",
    },
    null,
    2,
  ),
);
