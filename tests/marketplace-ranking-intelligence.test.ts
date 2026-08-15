import { describe, expect, it } from "vitest";

import { evaluateRankingEligibility } from "@/lib/marketplace-ranking-intelligence/eligibility";
import { evaluateProductRanking } from "@/lib/marketplace-ranking-intelligence/ranking-engine";
import { computeRankingScore } from "@/lib/marketplace-ranking-intelligence/ranking-score";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import { evaluateQualityGates } from "@/lib/marketplace-ranking-intelligence/quality-gates";
import { buildRankingExplanation } from "@/lib/marketplace-ranking-intelligence/ranking-explainer";
import { pickNextBestAction } from "@/lib/marketplace-ranking-intelligence/ranking-recommendations";
import { simulateRankingChanges } from "@/lib/marketplace-ranking-intelligence/ranking-simulator";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

const baseProduct: RankingProductInput = {
  id: "p1",
  name: "Походный стол",
  price: 4990,
  compareAt: null,
  status: "ACTIVE",
  stock: 5,
  views: 200,
  favoritesCount: 8,
  categoryId: "cat1",
  categoryName: "Туризм",
  descriptionLength: 120,
  seoTitleLength: 24,
  seoDescriptionLength: 80,
  photoCount: 2,
  hasVideo: false,
  characteristicCount: 4,
  hasBrand: true,
  sellerId: "seller1",
  sellerBlocked: false,
  sellerTrustScore: 78,
  sellerReviewsCount: 12,
  sellerAverageRating: 4.6,
  sellerCompletedOrders: 20,
  sellerCancellationRate: 0.02,
  moderationStatus: "APPROVED",
  prohibitedHit: false,
  qualityScore: 75,
  cartAdds: 8,
  ordersCount: 3,
  promotionActive: false,
};

describe("marketplace ranking intelligence", () => {
  it("marks product NOT_ELIGIBLE without photos", () => {
    const result = evaluateRankingEligibility({ ...baseProduct, photoCount: 0 });
    expect(result.status).toBe("NOT_ELIGIBLE");
    expect(result.messages).toContain("Нет фото");
  });

  it("computes 0-100 score with group breakdown", () => {
    const score = computeRankingScore(baseProduct, DEFAULT_RANKING_WEIGHTS_V1);
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.product).toBeGreaterThan(0);
    expect(score.seller).toBeGreaterThan(0);
  });

  it("blocks TOP without main photo quality gate", () => {
    const score = computeRankingScore(baseProduct, DEFAULT_RANKING_WEIGHTS_V1);
    const gate = evaluateQualityGates({ ...baseProduct, photoCount: 0 }, score);
    expect(gate.topBlocked).toBe(true);
  });

  it("explains blockers with estimated loss", () => {
    const score = computeRankingScore(baseProduct, DEFAULT_RANKING_WEIGHTS_V1);
    const explanation = buildRankingExplanation(baseProduct, score, 18);
    expect(explanation.blockers.length).toBeGreaterThan(0);
    expect(explanation.estimatedPosition).toBe(18);
  });

  it("picks one next best action for low photo count", () => {
    const score = computeRankingScore(baseProduct, DEFAULT_RANKING_WEIGHTS_V1);
    const action = pickNextBestAction(baseProduct, score);
    expect(action?.title.toLowerCase()).toContain("фото");
  });

  it("simulates score and position uplift", () => {
    const score = computeRankingScore(baseProduct, DEFAULT_RANKING_WEIGHTS_V1);
    const simulation = simulateRankingChanges({
      product: baseProduct,
      peerScores: [90, 85, score.overall, 70, 65],
      weights: DEFAULT_RANKING_WEIGHTS_V1,
      changes: { improveFirstPhoto: true, addVideo: true, reducePricePercent: 5 },
    });
    expect(simulation.predictedScore).toBeGreaterThanOrEqual(simulation.currentScore);
  });

  it("evaluateProductRanking stays advisory (returns version + weights)", async () => {
    const result = await evaluateProductRanking(baseProduct, DEFAULT_RANKING_WEIGHTS_V1);
    expect(result.algorithmVersion).toBeTruthy();
    expect(result.weights.length).toBeGreaterThan(0);
    expect(result.eligibility.status).toBe("ELIGIBLE");
  });
});
