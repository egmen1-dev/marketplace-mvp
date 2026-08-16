import { describe, expect, it, beforeEach } from "vitest";

import { buildCausalKnowledgeGraph } from "@/lib/ccos/graph";
import { buildProductUnderstanding } from "@/lib/ccos/product";
import {
  DEFAULT_SCENARIOS,
  applyScenarioToRankingInput,
  assertTwinGovernance,
  cacheTwinSimulation,
  computeTwinAccuracySummary,
  computeTwinConfidence,
  createLearningFeedbackFromTwinError,
  denyTwinProductionWrite,
  getCachedTwinSimulation,
  isCcosTwinPlatformEnabled,
  recordTwinActualOutcome,
  resetTwinMemory,
  resetTwinSimulationCache,
  runMonteCarloSimulation,
  runTwinSimulationWithRankingInput,
  saveTwinSimulationMemory,
  shadowRankingSimulate,
} from "@/lib/ccos/twin";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";
import { toMobileScenarioSimulatorResponse } from "@/lib/marketplace-cognitive-platform/twin";
import { currentMarketplaceBrainVersion } from "@/lib/ccos/knowledge/versions";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fanProduct: RankingProductInput = {
  id: "fan-1",
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

describe("ccos wave 5 digital twin platform", () => {
  beforeEach(() => {
    resetTwinMemory();
    resetTwinSimulationCache();
  });

  it("blocks twin writes to production", () => {
    expect(() => denyTwinProductionWrite("update_product")).toThrow(/Twin cannot write/);
    expect(assertTwinGovernance().twinToProductionBlocked).toBe(true);
    expect(assertTwinGovernance().requiresHumanApproval).toBe(true);
  });

  it("runs multi-scenario simulation on shadow ranking", async () => {
    const peerScores = [72, 68, 65, 60, 55];
    const report = await runTwinSimulationWithRankingInput({
      productId: fanProduct.id,
      rankingInput: fanProduct,
      peerScores,
      scenarioIds: ["scenario_photo", "scenario_price_3", "scenario_combo"],
      graphCoverage: 0.6,
      verifiedFactCount: 2,
    });

    expect(report.scenarioCount).toBe(3);
    expect(report.governance.shadowRankingOnly).toBe(true);
    expect(report.bestScenarioId).toBeTruthy();
    expect(report.comparison[0].rank).toBe(1);
    expect(report.advisoryOnly).toBe(true);
  });

  it("combo scenario beats single photo or price in ranking", async () => {
    const report = await runTwinSimulationWithRankingInput({
      productId: fanProduct.id,
      rankingInput: fanProduct,
      peerScores: [70, 66, 62],
      scenarioIds: ["scenario_photo", "scenario_price_3", "scenario_combo"],
    });
    const combo = report.scenarios.find((s) => s.scenarioId === "scenario_combo");
    const photo = report.scenarios.find((s) => s.scenarioId === "scenario_photo");
    expect(combo?.predicted.positionDelta ?? 0).toBeGreaterThanOrEqual(photo?.predicted.positionDelta ?? 0);
  });

  it("runs monte carlo with probabilities", () => {
    const mc = runMonteCarloSimulation({
      iterations: 40,
      baseResult: {
        predicted: { positionDelta: 8, ctrDeltaPct: 12, conversionDeltaPct: 6, revenueDeltaPct: 9 },
      },
    });
    expect(mc.iterations).toBe(40);
    expect(mc.probabilities.ctrGrowth).toBeGreaterThan(0);
    expect(mc.median.ctrDeltaPct).not.toBeNull();
  });

  it("assesses price cut risk", async () => {
    const report = await runTwinSimulationWithRankingInput({
      productId: fanProduct.id,
      rankingInput: fanProduct,
      scenarioIds: ["scenario_price_15"],
    });
    const risky = report.scenarios[0];
    expect(risky.risk.level).toMatch(/medium|high/);
    expect(risky.risk.factors.length).toBeGreaterThan(0);
  });

  it("includes confidence reason sample size and coverage", () => {
    const confidence = computeTwinConfidence({
      sampleSize: 240,
      knowledgeCoverage: 0.4,
      graphCoverage: 0.55,
      monteCarloStability: 0.7,
      hasBehaviourData: true,
    });
    expect(confidence.sampleSize).toBe(240);
    expect(confidence.knowledgeCoverage).toBe(0.4);
    expect(confidence.graphCoverage).toBe(0.55);
    expect(confidence.reason.length).toBeGreaterThan(5);
  });

  it("uses shadow ranking without touching production resolveOrderBy", () => {
    const source = readFileSync(
      resolve(process.cwd(), "features/products/queries.ts"),
      "utf8",
    );
    expect(source.includes("lib/ccos/twin")).toBe(false);
    expect(source.includes("shadowRanking")).toBe(false);

    const shadow = shadowRankingSimulate({
      baseline: fanProduct,
      simulated: applyScenarioToRankingInput(fanProduct, DEFAULT_SCENARIOS[0]),
      peerScores: [70, 65, 60],
      weights: DEFAULT_RANKING_WEIGHTS_V1,
    });
    expect(shadow.scoreDelta).toBeGreaterThan(0);
  });

  it("builds causal knowledge graph for twin coverage", () => {
    const understanding = buildProductUnderstanding({
      title: fanProduct.name,
      description: "Тихий вентилятор для дома",
      photoCount: 3,
    });
    const graph = buildCausalKnowledgeGraph({ productUnderstanding: understanding });
    expect(graph.coverage).toBeGreaterThan(0);
    expect(graph.nodes.length).toBeGreaterThan(3);
  });

  it("stores twin memory and computes accuracy", () => {
    const mem = saveTwinSimulationMemory({
      productId: fanProduct.id,
      app: "marketplace",
      result: {
        scenarioId: "scenario_photo",
        scenarioLabel: "Фото",
        predicted: { ctrDeltaPct: 12 },
        monteCarlo: { iterations: 10, probabilities: {}, median: {} },
        risk: { level: "low", score: 20, factors: [], summary: "Risk Low" },
        confidence: computeTwinConfidence({
          sampleSize: 100,
          knowledgeCoverage: 0.3,
          graphCoverage: 0.4,
        }),
        advisoryOnly: true,
      },
    });

    recordTwinActualOutcome({
      memoryId: mem.id,
      actual: { ctrDeltaPct: 10, recordedAt: new Date().toISOString() },
    });

    const accuracy = computeTwinAccuracySummary(fanProduct.id);
    expect(accuracy.evaluatedCount).toBe(1);
    expect(accuracy.meanAccuracy).toBeGreaterThan(0.8);
  });

  it("creates learning hypothesis when prediction error is large", () => {
    const mem = saveTwinSimulationMemory({
      productId: fanProduct.id,
      app: "marketplace",
      result: {
        scenarioId: "scenario_photo",
        scenarioLabel: "Фото",
        predicted: { ctrDeltaPct: 20 },
        monteCarlo: { iterations: 10, probabilities: {}, median: {} },
        risk: { level: "low", score: 10, factors: [], summary: "Risk Low" },
        confidence: computeTwinConfidence({
          sampleSize: 50,
          knowledgeCoverage: 0.2,
          graphCoverage: 0.2,
        }),
        advisoryOnly: true,
      },
    });
    recordTwinActualOutcome({
      memoryId: mem.id,
      actual: { ctrDeltaPct: 5, recordedAt: new Date().toISOString() },
    });
    mem.accuracy = 0.4;

    const hypothesis = createLearningFeedbackFromTwinError({ record: mem, errorThreshold: 0.15 });
    expect(hypothesis?.status).toBe("PROPOSED");
    expect(hypothesis?.claim).toMatch(/ошиблась/);
  });

  it("returns mobile scenario simulator response", async () => {
    const report = await runTwinSimulationWithRankingInput({
      productId: fanProduct.id,
      rankingInput: fanProduct,
      scenarioIds: ["scenario_photo"],
    });
    const mobile = toMobileScenarioSimulatorResponse(report, "scenario_photo");
    expect(mobile?.scenarioLabel).toMatch(/фото/i);
    expect(mobile?.confidence.label).toBeTruthy();
    expect(mobile?.advisoryOnly).toBe(true);
  });

  it("caches offline simulation payload", async () => {
    const report = await runTwinSimulationWithRankingInput({
      productId: fanProduct.id,
      rankingInput: fanProduct,
      scenarioIds: ["scenario_photo"],
    });
    cacheTwinSimulation({ productId: fanProduct.id, app: "marketplace", report, pendingSync: true });
    const cached = getCachedTwinSimulation(fanProduct.id);
    expect(cached?.pendingSync).toBe(true);
    expect(cached?.report.scenarioCount).toBe(1);
  });

  it("uses marketplace-brain-v5 when twin flag is on", () => {
    const prev = process.env.CCOS_TWIN_PLATFORM_ENABLED;
    process.env.CCOS_TWIN_PLATFORM_ENABLED = "true";
    expect(currentMarketplaceBrainVersion()).toBe("marketplace-brain-v5-twin");
    process.env.CCOS_TWIN_PLATFORM_ENABLED = prev;
  });

  it("twin platform flag requires CCOS_ENABLED", () => {
    const prevCcos = process.env.CCOS_ENABLED;
    const prevTwin = process.env.CCOS_TWIN_PLATFORM_ENABLED;
    process.env.CCOS_ENABLED = "false";
    process.env.CCOS_TWIN_PLATFORM_ENABLED = "true";
    expect(isCcosTwinPlatformEnabled()).toBe(false);
    process.env.CCOS_ENABLED = prevCcos;
    process.env.CCOS_TWIN_PLATFORM_ENABLED = prevTwin;
  });
});
