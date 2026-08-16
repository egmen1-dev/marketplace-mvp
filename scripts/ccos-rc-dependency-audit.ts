#!/usr/bin/env tsx
/**
 * EPIC 77 — RC-1 / PRE-WAVE-6 Dependency Audit (v2)
 * Usage: tsx scripts/ccos-rc-dependency-audit.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runCcosDependencyAudit, formatDependencyMap } from "@/lib/ccos/rc";

const report = runCcosDependencyAudit();
const outDir = join(process.cwd(), "artifacts/ccos-rc-1");
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, "dependency-audit.json"), JSON.stringify(report, null, 2));
writeFileSync(join(outDir, "dependency-map.txt"), formatDependencyMap(report));

const output = {
  auditVersion: "rc-dependency-audit-v2",
  passed: report.passed,
  architectureClean: report.architectureClean,
  cycles: report.summary.cycleCount,
  violations: report.summary.violationCount,
  forbiddenEdges: report.summary.forbiddenEdgeCount,
  edges: report.summary.edgeCount,
  layers: report.layerAnalysis.layers.map((l) => l.label),
  forbiddenViolations: report.layerAnalysis.forbiddenViolations,
  map: formatDependencyMap(report),
};

console.log(JSON.stringify(output, null, 2));

process.exit(report.passed && report.architectureClean ? 0 : 1);
