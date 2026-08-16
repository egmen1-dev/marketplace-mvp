import { describe, expect, it } from "vitest";

import {
  generateRankingLab1000Products,
  runBadProductLab,
  runRankingLab1000,
  resetRankingLabCache,
  computeFactorImportance,
  runSensitivityLab,
  buildRankingAcademy,
  buildSellerAdvisor,
  predictTopPosition,
  RANKING_LAB_DATASET_SIZE,
} from "@/lib/ranking-lab";
import { rankProductsByScore } from "@/lib/marketplace-ranking-intelligence/calibration-100";

describe("ranking lab 1000", () => {
  it("generates exactly 1000 structured products", () => {
    const products = generateRankingLab1000Products();
    expect(products).toHaveLength(RANKING_LAB_DATASET_SIZE);
    expect(new Set(products.map((p) => p.id)).size).toBe(1000);
  });

  it("runs full lab pipeline with importance and bad product verdict", async () => {
    resetRankingLabCache();
    process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED = "true";
    const report = await runRankingLab1000();
    expect(report.datasetSize).toBe(1000);
    expect(report.importance.length).toBeGreaterThan(5);
    const totalInfluence = report.importance.reduce((s, r) => s + r.influencePercent, 0);
    expect(totalInfluence).toBeGreaterThan(95);
    expect(totalInfluence).toBeLessThan(105);
    expect(report.badProductLab.verdict).toBe("НЕТ");
    expect(report.productReports).toHaveLength(1000);
  });

  it("computes sensitivity steps with position improvement", () => {
    const products = generateRankingLab1000Products();
    const ranked = rankProductsByScore(products);
    const mid = ranked.find((r) => r.position > 100 && r.position < 200);
    expect(mid).toBeTruthy();
    const sensitivity = runSensitivityLab(products, mid!.product.id);
    expect(sensitivity?.steps.length).toBeGreaterThan(0);
    expect(sensitivity!.baselinePosition).toBeGreaterThan(10);
  });

  it("builds seller advisor with expected gain and probability", () => {
    const products = generateRankingLab1000Products();
    const ranked = rankProductsByScore(products);
    const target = ranked[Math.floor(ranked.length / 2)]!;
    const advisor = buildSellerAdvisor(products, target.product.id);
    expect(advisor).toBeTruthy();
    expect(advisor!.actions.length).toBeGreaterThan(0);
    expect(advisor!.actions[0]!.successProbabilityPercent).toBeGreaterThan(50);
  });

  it("predicts improved position after combined changes", () => {
    const products = generateRankingLab1000Products();
    const ranked = rankProductsByScore(products);
    const target = ranked.find((r) => r.position > 20)!;
    const prediction = predictTopPosition({
      allProducts: products,
      productId: target.product.id,
    });
    expect(prediction).toBeTruthy();
    expect(prediction!.predictedPosition).toBeLessThanOrEqual(prediction!.currentPosition);
  });

  it("ranking academy targets TOP-10 path", () => {
    const products = generateRankingLab1000Products();
    const ranked = rankProductsByScore(products);
    const target = ranked.find((r) => r.position > 30 && r.position < 80)!;
    const academy = buildRankingAcademy({
      allProducts: products,
      productId: target.product.id,
      targetPosition: 10,
    });
    expect(academy).toBeTruthy();
    expect(academy!.targetPosition).toBe(10);
    expect(academy!.steps.length).toBeGreaterThan(0);
  });

  it("bad products cannot reach TOP-10 in lab pool", () => {
    const products = generateRankingLab1000Products();
    const report = runBadProductLab(products);
    expect(report.cases.every((c) => !c.canReachTop || c.bestPosition > 10)).toBe(true);
  });

  it("importance engine ranks behaviour factors competitively", () => {
    const products = generateRankingLab1000Products();
    const ranked = rankProductsByScore(products).map((r) => ({
      product: r.product,
      position: r.position,
    }));
    const importance = computeFactorImportance(ranked);
    const ctr = importance.find((i) => i.factorKey === "ctr");
    expect(ctr).toBeTruthy();
    expect(ctr!.influencePercent).toBeGreaterThan(5);
  });
});
