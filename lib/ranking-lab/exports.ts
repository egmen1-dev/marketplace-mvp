import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { RankingLab1000Report } from "./types";

function csvEscape(value: string | number | boolean): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportRankingLabJson(
  report: RankingLab1000Report,
  outDir: string,
): string {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "ranking-lab-1000.json");
  writeFileSync(path, JSON.stringify(report, null, 2), "utf8");
  return path;
}

export function exportProductReportsCsv(
  report: RankingLab1000Report,
  outDir: string,
): string {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "product-reports.csv");
  const header = [
    "productId",
    "name",
    "category",
    "position",
    "totalScore",
    "organicScore",
    "topBlocked",
    "eligibility",
    "topFactor",
    "topFactorPoints",
  ].join(",");
  const lines = report.productReports.map((r) => {
    const top = r.contributions[0];
    return [
      r.productId,
      r.name,
      r.category,
      r.position,
      r.totalScore,
      r.organicScore,
      r.topBlocked,
      r.eligibility,
      top?.label ?? "",
      top?.points ?? 0,
    ]
      .map(csvEscape)
      .join(",");
  });
  writeFileSync(path, [header, ...lines].join("\n"), "utf8");
  return path;
}

export function exportImportanceCsv(
  report: RankingLab1000Report,
  outDir: string,
): string {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "factor-importance.csv");
  const header = "factorKey,label,influencePercent,avgContribution";
  const lines = report.importance.map((r) =>
    [r.factorKey, r.label, r.influencePercent, r.avgContribution].map(csvEscape).join(","),
  );
  writeFileSync(path, [header, ...lines].join("\n"), "utf8");
  return path;
}

export function exportMarkdownReport(
  report: RankingLab1000Report,
  outDir: string,
): string {
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "RANKING_LAB_1000_REPORT.md");
  const dash = report.marketplaceDashboard;
  const md = `# Ranking Lab 1000 Report

Generated: ${report.generatedAt}
Seed: ${report.seed}
Dataset: ${report.datasetSize} products

## Marketplace Dashboard

| Metric | Value |
|--------|-------|
| Average score | ${dash.averageScore} |
| Average trust | ${dash.averageTrust} |
| Average SEO | ${dash.averageSeo} |
| Average CTR % | ${dash.averageCtr} |
| Average conversion % | ${dash.averageConversion} |
| Good cards | ${dash.goodCardsPercent}% |
| Bad cards | ${dash.badCardsPercent}% |

## Factor Importance

| Factor | Influence |
|--------|-----------|
${report.importance.map((i) => `| ${i.label} | ${i.influencePercent}% |`).join("\n")}

## Bad Product Lab

**Verdict:** ${report.badProductLab.verdict}

${report.badProductLab.summary}

${report.badProductLab.cases
  .map(
    (c) =>
      `- **${c.label}**: TOP reachable = ${c.canReachTop ? "да" : "нет"}, best #${c.bestPosition} — ${c.reasons.slice(0, 2).join("; ")}`,
  )
  .join("\n")}

## Sensitivity Sample

${
  report.sensitivitySamples[0]
    ? report.sensitivitySamples[0].steps
        .map(
          (s) =>
            `- ${s.change}: #${s.positionBefore} → #${s.positionAfter} (${s.delta >= 0 ? "+" : ""}${s.delta})`,
        )
        .join("\n")
    : "—"
}

## Ranking Academy Sample

${
  report.academySamples[0]
    ? `Product **${report.academySamples[0].productName}** at #${report.academySamples[0].currentPosition}, target TOP-${report.academySamples[0].targetPosition}, success ${report.academySamples[0].successProbabilityPercent}%`
    : "—"
}
`;
  writeFileSync(path, md, "utf8");
  return path;
}

export function exportAllRankingLabArtifacts(
  report: RankingLab1000Report,
  outDir: string,
): { json: string; csvProducts: string; csvImportance: string; markdown: string } {
  return {
    json: exportRankingLabJson(report, outDir),
    csvProducts: exportProductReportsCsv(report, outDir),
    csvImportance: exportImportanceCsv(report, outDir),
    markdown: exportMarkdownReport(report, outDir),
  };
}
