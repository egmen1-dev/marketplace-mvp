#!/usr/bin/env tsx
/**
 * MARKETPLACE-RANKING-LAB-1000-001 — generate lab artifacts (JSON, CSV, markdown).
 * Does NOT modify live search ranking.
 */
import { join } from "node:path";

import { exportAllRankingLabArtifacts, runRankingLab1000 } from "@/lib/ranking-lab";

const outDir = join(process.cwd(), "artifacts/ranking-lab-1000");

const report = runRankingLab1000();
const paths = exportAllRankingLabArtifacts(report, outDir);

console.log("Ranking Lab 1000 complete");
console.log(JSON.stringify({ outDir, ...paths, datasetSize: report.datasetSize }, null, 2));
console.log("\nTop factors:");
for (const row of report.importance.slice(0, 5)) {
  console.log(`  ${row.label}: ${row.influencePercent}%`);
}
console.log(`\nBad product lab: ${report.badProductLab.verdict} — ${report.badProductLab.summary}`);
