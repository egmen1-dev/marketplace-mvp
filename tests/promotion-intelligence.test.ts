import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  OPPORTUNITY_WEIGHTS,
  calculatePromotionOpportunityBreakdown,
  calculatePromotionOpportunityScore,
  resolveRecommendationLabel,
  resolveRecommendedPlan,
} from "@/lib/promotion/intelligence/score";
import {
  assertSellerRecommendationsAccess,
  generatePromotionRecommendations,
} from "@/lib/promotion/intelligence/recommendations";
import {
  PromotionForbiddenError,
} from "@/lib/promotion/permissions";
import { prisma } from "@/lib/prisma";

const PREV_INTELLIGENCE = process.env.PROMOTION_INTELLIGENCE_ENABLED;

const strongInput = {
  qualityScore: 85,
  productViews: 150,
  addToCart: 12,
  orderCount: 5,
  stock: 10,
  priceRatio: 0.88,
  sellerVerified: true,
  sellerBlocked: false,
  sellerRating: 4.5,
};

describe("PromotionOpportunityScore", () => {
  it("weights factors to 0-100", () => {
    const totalWeight = Object.values(OPPORTUNITY_WEIGHTS).reduce(
      (a, b) => a + b,
      0,
    );
    expect(totalWeight).toBe(100);

    const score = calculatePromotionOpportunityScore(strongInput);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("penalizes missing stock and blockers", () => {
    const strong = calculatePromotionOpportunityScore(strongInput);
    const weak = calculatePromotionOpportunityScore({
      ...strongInput,
      stock: 0,
      qualityScore: 30,
      addToCart: 0,
      productViews: 2,
      sellerBlocked: true,
    });
    expect(weak).toBeLessThan(strong);
    expect(weak).toBeLessThan(65);
  });

  it("maps recommended plan by score bands", () => {
    expect(resolveRecommendedPlan(85, true)).toBe("BOOST");
    expect(resolveRecommendedPlan(65, true)).toBe("GROWTH");
    expect(resolveRecommendedPlan(40, true)).toBeNull();
    expect(resolveRecommendedPlan(90, false)).toBeNull();
  });

  it("builds human-readable recommendation labels", () => {
    expect(resolveRecommendationLabel(70, true)).toBe(
      "Рекомендуется продвижение",
    );
    expect(resolveRecommendationLabel(70, false)).toBe(
      "Не рекомендуем запускать рекламу",
    );
    expect(resolveRecommendationLabel(30, true)).toBe(
      "Низкий потенциал продвижения",
    );
  });

  it("exposes factor breakdown", () => {
    const breakdown = calculatePromotionOpportunityBreakdown(strongInput);
    expect(breakdown.quality).toBeGreaterThan(0);
    expect(breakdown.conversion).toBeGreaterThan(0);
    expect(breakdown.stock).toBe(OPPORTUNITY_WEIGHTS.stock);
  });
});

describe("generatePromotionRecommendations", () => {
  beforeEach(() => {
    process.env.PROMOTION_INTELLIGENCE_ENABLED = "true";
  });

  afterEach(() => {
    process.env.PROMOTION_INTELLIGENCE_ENABLED = PREV_INTELLIGENCE;
  });

  it("returns scored recommendations for seller products", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true },
      where: { products: { some: {} } },
    });
    if (!seller) return;

    const { recommendations } = await generatePromotionRecommendations(
      seller.id,
    );
    expect(Array.isArray(recommendations)).toBe(true);
    if (recommendations.length > 0) {
      const first = recommendations[0];
      expect(first.productId).toBeTruthy();
      expect(first.score).toBeGreaterThanOrEqual(0);
      expect(first.score).toBeLessThanOrEqual(100);
      expect(first.recommendation).toBeTruthy();
      expect(Array.isArray(first.reasons)).toBe(true);
    }
  });

  it("rejects cross-seller access", async () => {
    const seller = await prisma.sellerProfile.findFirst({ select: { id: true } });
    const foreign = await prisma.product.findFirst({
      where: seller ? { sellerId: { not: seller.id } } : undefined,
      select: { id: true },
    });
    if (!seller || !foreign) return;

    await expect(
      assertSellerRecommendationsAccess(seller.id, foreign.id),
    ).rejects.toBeInstanceOf(PromotionForbiddenError);
  });

  it("returns empty when intelligence flag is off", async () => {
    process.env.PROMOTION_INTELLIGENCE_ENABLED = "false";
    const seller = await prisma.sellerProfile.findFirst({ select: { id: true } });
    if (!seller) return;

    const { recommendations } = await generatePromotionRecommendations(
      seller.id,
    );
    expect(recommendations).toEqual([]);
  });
});
