import { evaluateRankingEligibility } from "@/lib/marketplace-ranking-intelligence/eligibility";
import { rankProductsByScore } from "@/lib/marketplace-ranking-intelligence/calibration-100";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";

import { runBadProductLab } from "./bad-product-detector";
import { buildProductFactorReport } from "./factor-analysis";
import { generateRankingLab1000Products } from "./generator-1000";
import { computeFactorImportance } from "./importance-engine";
import { buildMarketplaceDashboard } from "./marketplace-dashboard";
import { enrichRankingProductsWithContentQuality } from "./quality-enrichment";
import { buildRankingAcademy } from "./ranking-academy";
import { buildSellerAdvisor } from "./seller-advisor";
import { pickMidTierProductId, runSensitivityLab } from "./sensitivity-engine";
import { explainTopPosition } from "./top-explainer";
import { predictTopPosition } from "./top-predictor";
import type { RankingLab1000Report } from "./types";
import { RANKING_LAB_SEED } from "./types";

let cachedReport: RankingLab1000Report | null = null;
let cachePromise: Promise<RankingLab1000Report> | null = null;

/** Full in-memory lab pipeline — does not touch live search. */
export async function runRankingLab1000(): Promise<RankingLab1000Report> {
  const generated = generateRankingLab1000Products();
  const products = await enrichRankingProductsWithContentQuality(generated);
  const weights = DEFAULT_RANKING_WEIGHTS_V1;
  const rankedRaw = rankProductsByScore(products, weights);

  const ranked = rankedRaw.map((row) => ({
    product: row.product,
    position: row.position,
    totalScore: row.totalScore,
    organicScore: row.organic.overall,
    topBlocked: row.qualityGate.topBlocked,
  }));

  const productReports = rankedRaw.map((row) =>
    buildProductFactorReport({
      product: row.product,
      position: row.position,
      totalScore: row.totalScore,
      organicScore: row.organic.overall,
      promotionContribution: row.promotionContribution,
      topBlocked: row.qualityGate.topBlocked,
      eligibility: evaluateRankingEligibility(row.product).status,
      weights,
    }),
  );

  const importance = computeFactorImportance(ranked, weights);
  const badProductLab = runBadProductLab(products);

  const midId = pickMidTierProductId(ranked);
  const sampleIds = [
    midId,
    ranked.find((r) => r.position === 12)?.product.id,
    ranked.find((r) => r.position === 47)?.product.id,
    ranked[0]?.product.id,
  ].filter(Boolean) as string[];

  const sensitivitySamples = sampleIds
    .slice(0, 2)
    .map((id) => runSensitivityLab(products, id))
    .filter(Boolean) as NonNullable<ReturnType<typeof runSensitivityLab>>[];

  const advisorSamples = sampleIds
    .slice(0, 3)
    .map((id) => buildSellerAdvisor(products, id))
    .filter(Boolean) as NonNullable<ReturnType<typeof buildSellerAdvisor>>[];

  const topExplanations = sampleIds
    .slice(0, 4)
    .map((id) => {
      const row = ranked.find((r) => r.product.id === id);
      return row ? explainTopPosition(row) : null;
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof explainTopPosition>>[];

  const predictorSamples = sampleIds
    .slice(0, 2)
    .map((id) => predictTopPosition({ allProducts: products, productId: id }))
    .filter(Boolean) as NonNullable<ReturnType<typeof predictTopPosition>>[];

  const academySamples = sampleIds
    .slice(0, 3)
    .map((id) => buildRankingAcademy({ allProducts: products, productId: id }))
    .filter(Boolean) as NonNullable<ReturnType<typeof buildRankingAcademy>>[];

  const marketplaceDashboard = buildMarketplaceDashboard(ranked);

  return {
    generatedAt: new Date().toISOString(),
    seed: RANKING_LAB_SEED,
    datasetSize: products.length,
    weights,
    products,
    ranked,
    productReports,
    importance,
    sensitivitySamples,
    badProductLab,
    advisorSamples,
    topExplanations,
    predictorSamples,
    academySamples,
    marketplaceDashboard,
    experiments: [
      {
        id: "lab-1000-baseline",
        name: "1000-product baseline ranking",
        datasetSize: products.length,
        completedAt: new Date().toISOString(),
      },
      {
        id: "lab-bad-product",
        name: "Bad product TOP gate",
        datasetSize: badProductLab.cases.length,
        completedAt: new Date().toISOString(),
      },
    ],
  };
}

export async function getRankingLab1000Report(): Promise<RankingLab1000Report> {
  if (cachedReport) return cachedReport;
  if (!cachePromise) {
    cachePromise = runRankingLab1000().then((report) => {
      cachedReport = report;
      return report;
    });
  }
  return cachePromise;
}

/** Test helper — bust memoized report. */
export function resetRankingLabCache(): void {
  cachedReport = null;
  cachePromise = null;
}

export async function getProductLabReport(productId: string) {
  const report = await getRankingLab1000Report();
  return {
    product: report.productReports.find((p) => p.productId === productId) ?? null,
    explanation: report.topExplanations.find((e) => e.productId === productId) ?? null,
    advisor: report.advisorSamples.find((a) => a.productId === productId) ??
      buildSellerAdvisor(report.products, productId),
    academy: report.academySamples.find((a) => a.productId === productId) ??
      buildRankingAcademy({ allProducts: report.products, productId }),
    predictor: predictTopPosition({ allProducts: report.products, productId }),
    sensitivity: runSensitivityLab(report.products, productId),
  };
}
