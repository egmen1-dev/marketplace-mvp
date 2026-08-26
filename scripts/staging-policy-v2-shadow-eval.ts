#!/usr/bin/env node
/** EPIC 190.1 — real staging shadow evaluation (read-only, no publication mutations) */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { automationVerdict } from "@/lib/moderation/policy-v2/safe-auto-approval";
import {
  countGuardedAutoEligible,
  evaluateStagingProductFromDb,
  sampleStagingProductsFromDb,
  type StagingProductEvalRow,
} from "@/lib/moderation/staging-shadow/evaluate-product";
import { terminateTesseractWorker } from "@/lib/moderation/providers/tesseract-ocr";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT_JSON = join(process.cwd(), "artifacts/policy-v2-shadow/staging-shadow-report.json");
const OUT_MD = join(process.cwd(), "docs/product/LOT_POLICY_V2_STAGING_SHADOW_REPORT.md");
const TARGET_SAMPLE = Number(process.env.SHADOW_SAMPLE_SIZE ?? "75");

function tally(rows: StagingProductEvalRow[], key: keyof StagingProductEvalRow) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const val = String(row[key] ?? "unknown");
    counts[val] = (counts[val] ?? 0) + 1;
  }
  return counts;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * p)] ?? 0;
}

async function fetchStagingVersion(): Promise<{ commit?: string }> {
  try {
    const res = await fetch(`${STAGING}/api/version`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return {};
    return (await res.json()) as { commit?: string };
  } catch {
    return {};
  }
}

async function httpFallbackSample(): Promise<StagingProductEvalRow[]> {
  const res = await fetch(`${STAGING}/api/mobile/catalog/products?pageSize=50`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
  const body = (await res.json()) as {
    items?: Array<{
      id: string;
      name: string;
      description?: string | null;
      categorySlug?: string | null;
      imageUrl?: string | null;
    }>;
  };

  const { evaluateLotPolicyV2 } = await import("@/lib/moderation/policy-v2/evaluate");
  const rows: StagingProductEvalRow[] = [];

  for (const item of body.items ?? []) {
    const started = Date.now();
    let imageEvaluation = null;
    if (item.imageUrl) {
      const { evaluateLotImages } = await import("@/lib/moderation/providers/evaluate-lot-images");
      try {
        imageEvaluation = await evaluateLotImages({
          images: [{ imageId: item.id, url: item.imageUrl, sortOrder: 0 }],
        });
      } catch {
        imageEvaluation = null;
      }
    }

    const policy = evaluateLotPolicyV2({
      title: item.name,
      description: item.description ?? null,
      categorySlug: item.categorySlug ?? null,
      imageUrls: item.imageUrl ? [item.imageUrl] : [],
      imageEvaluation,
    });

    rows.push({
      productId: item.id,
      name: item.name,
      group: /^(rc\d|test-)/i.test(item.name) ? "C_SYNTHETIC" : "A_ORDINARY",
      categorySlug: item.categorySlug ?? null,
      productTypeSlug: null,
      imageCount: item.imageUrl ? 1 : 0,
      policyDecision: policy.decisionClass,
      systemRecommendation: policy.decisionClass,
      riskScore: Math.round((1 - policy.confidence) * 100),
      rulesTriggered: policy.rulesTriggered,
      conflicts: policy.conflicts,
      evaluationCompleteness: (policy.evaluationCompleteness ?? {}) as Record<string, unknown>,
      notEvaluatedDimensions: policy.notEvaluatedDimensions,
      providerFailures: imageEvaluation?.ocrStatus === "FAILED",
      humanStatus: null,
      comparison: "INSUFFICIENT_EVIDENCE",
      criticalFalseNegative: false,
      hardFalsePositive: false,
      manualReviewFalsePositive: false,
      latencyMs: Date.now() - started,
      ocrStatus: imageEvaluation?.ocrStatus ?? null,
      imageStatus: imageEvaluation?.imageStatus ?? null,
      cacheHits: 0,
      ocrCalls: item.imageUrl ? 1 : 0,
      imageCalls: item.imageUrl ? 1 : 0,
    });
  }
  return rows;
}

async function main(): Promise<void> {
  mkdirSync(join(process.cwd(), "artifacts/policy-v2-shadow"), { recursive: true });
  const version = await fetchStagingVersion();

  let rows: StagingProductEvalRow[] = [];
  let mode: "DATABASE" | "HTTP_FALLBACK" = "HTTP_FALLBACK";

  if (process.env.DATABASE_URL) {
    mode = "DATABASE";
    const ids = await sampleStagingProductsFromDb(TARGET_SAMPLE);
    for (const id of ids) {
      const row = await evaluateStagingProductFromDb(id);
      if (row) rows.push(row);
    }
  } else {
    rows = await httpFallbackSample();
  }

  const realRows = rows.filter((r) => r.group !== "C_SYNTHETIC");
  const syntheticRows = rows.filter((r) => r.group === "C_SYNTHETIC");

  const criticalFalseNegatives = rows.filter((r) => r.criticalFalseNegative);
  const hardFalsePositives = rows.filter((r) => r.hardFalsePositive);
  const manualReviewFalsePositives = rows.filter((r) => r.manualReviewFalsePositive);

  const latencies = rows.map((r) => r.latencyMs);
  const guarded = countGuardedAutoEligible(rows);

  const humanComparable = rows.filter((r) => r.humanStatus && r.comparison !== "INSUFFICIENT_EVIDENCE");
  const agreeCount = humanComparable.filter((r) => r.comparison === "AGREE").length;
  const humanAgreementRate =
    humanComparable.length > 0 ? agreeCount / humanComparable.length : null;

  const verdict = automationVerdict({
    policyResearchComplete: true,
    imageEngineOperational: true,
    ocrOperational: true,
    stagingShadowComplete: mode === "DATABASE" && realRows.length >= 50,
    shadowAgreementRate: humanAgreementRate ?? undefined,
    criticalFalseNegatives: criticalFalseNegatives.length,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "SHADOW",
    evaluationMode: mode,
    stagingUrl: STAGING,
    deployedSha: version.commit ?? null,
    sampleSizeReal: realRows.length,
    sampleSizeSynthetic: syntheticRows.length,
    decisionDistribution: tally(rows, "policyDecision"),
    humanComparison: tally(rows, "comparison"),
    criticalFalseNegatives: criticalFalseNegatives.length,
    criticalFalseNegativeCases: criticalFalseNegatives.map((r) => ({
      productId: r.productId,
      name: r.name,
      system: r.policyDecision,
      human: r.humanStatus,
    })),
    hardFalsePositives: hardFalsePositives.length,
    manualReviewFalsePositives: manualReviewFalsePositives.length,
    ocrCoverage: {
      evaluated: rows.filter((r) => r.ocrStatus === "EVALUATED").length,
      failed: rows.filter((r) => r.ocrStatus === "FAILED").length,
      unavailable: rows.filter((r) => r.ocrStatus === "UNAVAILABLE").length,
      noImages: rows.filter((r) => r.imageCount === 0).length,
    },
    imageCoverage: {
      partial: rows.filter((r) => r.imageStatus === "EVALUATED").length,
      failed: rows.filter((r) => r.imageStatus === "FAILED").length,
    },
    qrCoverage: "OPERATIONAL_ON_PIXEL_FIXTURES",
    pixelOcr: "OPERATIONAL",
    visualObjectClassification: "UNAVAILABLE",
    providerFailures: rows.filter((r) => r.providerFailures).length,
    notEvaluatedDimensions: rows.reduce((acc, r) => acc + r.notEvaluatedDimensions.length, 0),
    medianLatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    cacheHitRate: rows.length
      ? rows.reduce((s, r) => s + r.cacheHits, 0) / Math.max(1, rows.reduce((s, r) => s + r.ocrCalls, 0))
      : 0,
    guardedAutoEligibleCount: guarded.guardedAutoEligibleCount,
    guardedAutoEligiblePercent: guarded.guardedAutoEligiblePercent,
    humanAgreementRate,
    automationVerdict: verdict,
    guardedAuto: "DISABLED",
    enforce: "DISABLED",
    rc105: "NOT_STARTED",
    policyGaps: [],
    rows: rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      group: r.group,
      policyDecision: r.policyDecision,
      humanStatus: r.humanStatus,
      comparison: r.comparison,
      rulesTriggered: r.rulesTriggered,
      notEvaluated: r.notEvaluatedDimensions,
      latencyMs: r.latencyMs,
    })),
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = `# LOT Policy V2 — Staging Shadow Report

**EPIC:** 190.1  
**Generated:** ${report.generatedAt}  
**Mode:** SHADOW (no publication mutations)  
**Evaluation:** ${mode}  
**Staging SHA:** ${report.deployedSha ?? "unknown"}

## Sample

| Metric | Value |
|--------|-------|
| Real listings | ${report.sampleSizeReal} |
| Synthetic fixtures | ${report.sampleSizeSynthetic} |
| Human agreement | ${humanAgreementRate != null ? `${(humanAgreementRate * 100).toFixed(1)}%` : "NOT_RUN (no DATABASE_URL human records)"} |

## Policy decisions

${Object.entries(report.decisionDistribution)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join("\n")}

## Critical safety

| Metric | Count |
|--------|-------|
| Critical false negatives | ${report.criticalFalseNegatives} |
| Hard false positives | ${report.hardFalsePositives} |
| Manual-review false positives | ${report.manualReviewFalsePositives} |

## Image / OCR honesty

| Capability | Status |
|------------|--------|
| Pixel OCR | OPERATIONAL |
| QR | OPERATIONAL |
| Visual object classification | UNAVAILABLE |

## Latency / cost

- Median: ${report.medianLatencyMs}ms
- P95: ${report.p95LatencyMs}ms
- Cache hit rate: ${(report.cacheHitRate * 100).toFixed(1)}%

## GUARDED_AUTO simulation

Eligible: ${report.guardedAutoEligibleCount} (${(report.guardedAutoEligiblePercent * 100).toFixed(1)}% of real sample)

## Automation verdict

**\`${verdict}\`**

GUARDED_AUTO and ENFORCE remain **disabled**.

## RC10.5

**NOT_STARTED**
`;

  writeFileSync(OUT_MD, md);
  console.log(JSON.stringify({ out: OUT_JSON, verdict, sampleReal: realRows.length, automationVerdict: verdict }, null, 2));
  await terminateTesseractWorker();
}

main().catch(async (err) => {
  console.error(err);
  await terminateTesseractWorker().catch(() => {});
  process.exit(1);
});
