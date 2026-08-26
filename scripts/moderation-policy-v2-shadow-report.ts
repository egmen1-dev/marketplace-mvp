#!/usr/bin/env node
/** Shadow validation report — evaluates fixtures + optional staging products (report only). */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { evaluateLotPolicyV2 } from "@/lib/moderation/policy-v2/evaluate";

const outDir = join(process.cwd(), "artifacts/policy-v2-shadow");
mkdirSync(outDir, { recursive: true });

const fixtures = JSON.parse(
  readFileSync("tests/fixtures/policy-v2/fixtures.json", "utf8"),
) as { fixtures: Array<{ id: string; expected: string; input: Record<string, unknown> }> };

const rows = fixtures.fixtures.map((fx) => {
  const result = evaluateLotPolicyV2(fx.input as Parameters<typeof evaluateLotPolicyV2>[0]);
  return {
    id: fx.id,
    expected: fx.expected,
    recommendation: result.decisionClass,
    agree: result.decisionClass === fx.expected,
    rules: result.rulesTriggered,
    notEvaluated: result.notEvaluatedDimensions,
  };
});

const agreement = rows.filter((r) => r.agree).length / rows.length;
const report = {
  generatedAt: new Date().toISOString(),
  mode: "SHADOW",
  fixtureCount: rows.length,
  agreementRate: agreement,
  disagreementCount: rows.length - rows.filter((r) => r.agree).length,
  rows,
  note: "Staging DB evaluation requires DATABASE_URL — fixture-only shadow in cloud CI.",
};

const outPath = join(outDir, "shadow-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outPath, agreementRate: agreement, mode: "SHADOW" }, null, 2));
