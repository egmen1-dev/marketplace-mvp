#!/usr/bin/env tsx
/**
 * EPIC 77 — RC-1 Dependency Audit
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

console.log(
  JSON.stringify(
    {
      passed: report.passed,
      cycles: report.summary.cycleCount,
      violations: report.summary.violationCount,
      edges: report.summary.edgeCount,
      map: formatDependencyMap(report),
    },
    null,
    2,
  ),
);

process.exit(report.passed && report.architectureClean ? 0 : 1);
