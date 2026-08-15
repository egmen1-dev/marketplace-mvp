import { describe, expect, it } from "vitest";

import {
  buildCalibration100Products,
  computePromotionContribution,
  runFullCalibrationLab,
} from "@/lib/marketplace-ranking-intelligence/calibration-100";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";

describe("ranking 100-product calibration lab", () => {
  it("builds exactly 100 controlled products", () => {
    const products = buildCalibration100Products();
    expect(products).toHaveLength(100);
    expect(products[0]?.id).toBe("BASELINE-001");
  });

  it("blocks bad products from buying TOP via promotion", () => {
    expect(
      computePromotionContribution({
        organicScore: 70,
        promotionActive: true,
        promotionInfluencePercent: 15,
        topBlocked: true,
      }),
    ).toBe(0);
  });

  it("runs reproducible lab with quality checks", () => {
    const first = runFullCalibrationLab(DEFAULT_RANKING_WEIGHTS_V1);
    const second = runFullCalibrationLab(DEFAULT_RANKING_WEIGHTS_V1);
    expect(first.productCount).toBe(100);
    expect(first.experimentCount).toBeGreaterThanOrEqual(20);
    expect(first.qualityChecks.negativeControlsBlockedFromTop).toBe(true);
    expect(first.qualityChecks.badPromoCannotBuyTop).toBe(true);
    expect(first.ranked[0]?.id).toBe(second.ranked[0]?.id);
    expect(first.ranked[0]?.totalScore).toBe(second.ranked[0]?.totalScore);
  });

  it("generates product reports with factor breakdown", () => {
    const lab = runFullCalibrationLab(DEFAULT_RANKING_WEIGHTS_V1);
    const report = lab.productReports.find((r) => r.productId === "BASELINE-001");
    expect(report?.eligibility).toBe("ELIGIBLE");
    expect(report?.factorBreakdown.photos).toBeGreaterThan(0);
    expect(report?.currentTestPosition).toBeGreaterThan(0);
  });
});
