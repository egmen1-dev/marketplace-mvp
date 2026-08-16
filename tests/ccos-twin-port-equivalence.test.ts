import { describe, expect, it, beforeEach } from "vitest";

import { resetSimulationPortRegistry } from "@/lib/ccos/simulation";
import { DEFAULT_SCENARIOS } from "@/lib/ccos/twin/scenarios";
import {
  applyScenarioToMarketplaceRankingInput,
  ensureMarketplaceRankingSimulationPortRegistered,
  marketplaceShadowRankingSimulate,
  runTwinSimulationWithRankingInput,
} from "@/lib/marketplace-cognitive-platform/adapters/ranking-simulation.adapter";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

const TOLERANCE = 0.01;

const fanProduct: RankingProductInput = {
  id: "fan-equiv",
  name: "Напольный вентилятор 5 лопастей",
  price: 4500,
  compareAt: null,
  status: "ACTIVE",
  stock: 8,
  views: 240,
  favoritesCount: 12,
  categoryId: "fans",
  categoryName: "Климат",
  descriptionLength: 140,
  seoTitleLength: 28,
  seoDescriptionLength: 90,
  photoCount: 3,
  hasVideo: false,
  characteristicCount: 5,
  hasBrand: true,
  sellerId: "seller-1",
  sellerBlocked: false,
  sellerTrustScore: 82,
  sellerReviewsCount: 20,
  sellerAverageRating: 4.7,
  sellerCompletedOrders: 35,
  sellerCancellationRate: 0.01,
  moderationStatus: "APPROVED",
  prohibitedHit: false,
  qualityScore: 80,
  cartAdds: 12,
  ordersCount: 6,
  promotionActive: false,
  photoQuality: 58,
  descriptionQuality: 65,
};

function near(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= TOLERANCE;
}

describe("ccos twin port equivalence — Фото + цена -3%", () => {
  beforeEach(() => {
    resetSimulationPortRegistry();
    ensureMarketplaceRankingSimulationPortRegistered();
  });

  it("port-based twin matches direct shadow ranking for combo scenario", async () => {
    const combo = DEFAULT_SCENARIOS.find((s) => s.id === "scenario_combo")!;
    const peerScores = [72, 68, 65, 60, 55];
    const simulated = applyScenarioToMarketplaceRankingInput(fanProduct, combo);

    const direct = marketplaceShadowRankingSimulate({
      baseline: fanProduct,
      simulated,
      peerScores,
      weights: DEFAULT_RANKING_WEIGHTS_V1,
    });

    const report = await runTwinSimulationWithRankingInput({
      productId: fanProduct.id,
      rankingInput: fanProduct,
      peerScores,
      scenarioIds: ["scenario_combo"],
      graphCoverage: 0.6,
      graphPropagatedConfidence: 0.48,
      verifiedFactCount: 2,
      weights: DEFAULT_RANKING_WEIGHTS_V1,
    });

    const twinCombo = report.scenarios.find((s) => s.scenarioId === "scenario_combo");
    expect(twinCombo).toBeDefined();
    expect(twinCombo?.simulationStatus).toBe("OK");
    expect(twinCombo?.portProvenance?.portId).toBe("marketplace-ranking-simulation");

    expect(near(twinCombo?.predicted.positionDelta, direct.positionDelta)).toBe(true);
    expect(near(twinCombo?.predicted.rankingScoreDelta, direct.scoreDelta)).toBe(true);
    expect(twinCombo!.confidence.overall).toBeLessThanOrEqual(0.48 * 1.05 + 0.001);
  });

  it("preserves decision ordering for photo vs combo scenarios", async () => {
    const report = await runTwinSimulationWithRankingInput({
      productId: fanProduct.id,
      rankingInput: fanProduct,
      peerScores: [70, 66, 62],
      scenarioIds: ["scenario_photo", "scenario_price_3", "scenario_combo"],
      graphPropagatedConfidence: 0.5,
    });

    const combo = report.scenarios.find((s) => s.scenarioId === "scenario_combo");
    const photo = report.scenarios.find((s) => s.scenarioId === "scenario_photo");
    expect((combo?.predicted.positionDelta ?? 0) >= (photo?.predicted.positionDelta ?? 0)).toBe(true);
    expect(report.bestScenarioId).toBeTruthy();
    expect(report.comparison[0].rank).toBe(1);
  });
});
