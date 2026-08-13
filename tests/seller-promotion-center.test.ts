import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { buildSmartBudgetRecommendation } from "@/lib/seller-promotion-center/budget";
import { buildSummaryFromRows, emptySummary } from "@/lib/seller-promotion-center/dashboard";
import { isSellerPromotionCenterEnabled } from "@/lib/seller-promotion-center/flags";
import { buildPromotionAiAdvice } from "@/lib/seller-promotion-center/insights";
import {
  assertAdminPromotionControlAccess,
  assertSellerPromotionCenterAccess,
  SellerPromotionCenterForbiddenError,
} from "@/lib/seller-promotion-center/permissions";
import {
  buildAnalyticsDetail,
  buildCampaignComparison,
  formatCtrDisplay,
  formatRoiDisplay,
} from "@/lib/seller-promotion-center/performance";
import {
  enrichOpportunities,
  mapRecommendationToOpportunity,
} from "@/lib/seller-promotion-center/recommendations";
import type { PromotionRecommendation } from "@/lib/promotion/intelligence/types";
import type { SellerPromotionRow } from "@/lib/promotion/types";

const PREV_FLAG = process.env.SELLER_PROMOTION_CENTER_ENABLED;

const baseReadiness = {
  ready: true,
  score: 80,
  blockers: [] as string[],
  improvements: [] as string[],
};

function mockPerformance(overrides: Partial<NonNullable<SellerPromotionRow["performance"]>> = {}) {
  return {
    impressions: 1000,
    clicks: 42,
    productViews: 120,
    addToCart: 8,
    checkoutStarted: 4,
    orders: 3,
    revenue: 15000,
    ctr: 4.2,
    conversionRate: 2.5,
    performanceScore: 72,
    promotionCost: 2990,
    profit: 12010,
    roiPercent: 401,
    roiLabel: "ROI +401%",
    ...overrides,
  };
}

function mockRow(overrides: Partial<SellerPromotionRow> = {}): SellerPromotionRow {
  return {
    productId: "prod-1",
    title: "Перфоратор Kolner",
    price: 4990,
    currency: "RUB",
    status: "ACTIVE",
    imageUrl: null,
    readiness: baseReadiness,
    campaign: null,
    isPromoted: true,
    placements: [],
    activePlacementCount: 1,
    performance: mockPerformance(),
    activeOrder: {
      id: "order-1",
      productId: "prod-1",
      sellerId: "seller-1",
      planId: "plan-1",
      amount: 2990,
      status: "ACTIVE",
      stripeSessionId: null,
      stripePaymentIntentId: null,
      paidAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      plan: {
        id: "plan-1",
        name: "GROWTH",
        price: 1990,
        durationDays: 14,
        label: "Growth",
        description: "14 days",
      },
    },
    ...overrides,
  };
}

const sampleRecommendation: PromotionRecommendation = {
  productId: "prod-2",
  productTitle: "Шуруповёрт",
  score: 86,
  recommendation: "Рекомендуется продвижение",
  reasons: ["высокий спрос категории", "конкуренты активно продвигаются"],
  improvements: [],
  timingReasons: ["сезонный спрос"],
  recommendedPlan: "GROWTH",
  recommendedPlanLabel: "Growth 14 дней",
  recommendedBudget: 1990,
  productViews: 1200,
  addToCart: 15,
  orderCount: 15,
  qualityScore: 82,
  ready: true,
  isPromoted: false,
  breakdown: {
    quality: 82,
    conversion: 70,
    stock: 90,
    priceCompetitiveness: 75,
    sellerTrust: 80,
    historicalSales: 65,
  },
};

describe("seller promotion center flag", () => {
  afterEach(() => {
    process.env.SELLER_PROMOTION_CENTER_ENABLED = PREV_FLAG;
  });

  it("is off by default", () => {
    delete process.env.SELLER_PROMOTION_CENTER_ENABLED;
    expect(isSellerPromotionCenterEnabled()).toBe(false);
  });

  it("enables when env is true", () => {
    process.env.SELLER_PROMOTION_CENTER_ENABLED = "true";
    expect(isSellerPromotionCenterEnabled()).toBe(true);
  });
});

describe("buildSummaryFromRows", () => {
  it("returns empty summary shape", () => {
    const summary = emptySummary();
    expect(summary.activeCampaigns).toBe(0);
    expect(summary.roiPercent).toBeNull();
    expect(summary.periodLabel).toContain("30");
  });

  it("aggregates spend, orders, revenue and ROI", () => {
    const summary = buildSummaryFromRows([
      mockRow(),
      mockRow({
        productId: "prod-2",
        isPromoted: false,
        performance: mockPerformance({
          orders: 15,
          revenue: 39000,
          promotionCost: 0,
        }),
        activeOrder: null,
      }),
    ]);

    expect(summary.activeCampaigns).toBe(1);
    expect(summary.spend).toBe(2990);
    expect(summary.orders).toBe(18);
    expect(summary.revenue).toBe(54000);
    expect(summary.roiPercent).toBeGreaterThan(1000);
    expect(summary.roiLabel).toMatch(/ROI \+/);
  });
});

describe("recommendations", () => {
  it("maps intelligence recommendation to opportunity", () => {
    const opp = mapRecommendationToOpportunity(sampleRecommendation);
    expect(opp.promotionScore).toBe(86);
    expect(opp.ready).toBe(true);
    expect(opp.reasons.some((r) => r.includes("остаток"))).toBe(true);
    expect(opp.recommendedPlan).toBe("GROWTH");
  });

  it("enriches opportunities with price and image", () => {
    const opportunities = enrichOpportunities({
      recommendations: [sampleRecommendation],
      imageByProductId: new Map([["prod-2", "https://img.test/a.jpg"]]),
      priceByProductId: new Map([["prod-2", { price: 3490, currency: "RUB" }]]),
    });
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.price).toBe(3490);
    expect(opportunities[0]?.imageUrl).toBe("https://img.test/a.jpg");
  });
});

describe("buildSmartBudgetRecommendation", () => {
  it("returns advisory budget with disclaimer", () => {
    const rec = buildSmartBudgetRecommendation({
      topRecommendation: sampleRecommendation,
      plans: [
        {
          id: "p1",
          name: "GROWTH",
          price: 1990,
          durationDays: 14,
          label: "Growth",
          description: "14 days",
        },
      ],
    });
    expect(rec).not.toBeNull();
    expect(rec?.recommendedAmount).toBe(1990);
    expect(rec?.durationDays).toBe(14);
    expect(rec?.disclaimer).toContain("не гарантируется");
    expect(rec?.why).toContain("Похожие");
  });

  it("returns null when recommendation not ready", () => {
    const rec = buildSmartBudgetRecommendation({
      topRecommendation: { ...sampleRecommendation, ready: false },
      plans: [],
    });
    expect(rec).toBeNull();
  });
});

describe("performance helpers", () => {
  it("builds analytics funnel", () => {
    const detail = buildAnalyticsDetail([mockRow()]);
    expect(detail.funnel).toHaveLength(5);
    expect(detail.funnel[0]?.label).toBe("Показ");
    expect(detail.metrics.clicks).toBe(42);
  });

  it("compares campaigns by ROI", () => {
    const comparison = buildCampaignComparison([
      mockRow({ productId: "a", performance: mockPerformance({ ctr: 4.2, roiPercent: 230 }) }),
      mockRow({
        productId: "b",
        title: "Товар B",
        performance: mockPerformance({ ctr: 1.8, roiPercent: 40, impressions: 500, clicks: 9 }),
      }),
    ]);
    expect(comparison[0]?.roiPercent).toBeGreaterThan(comparison[1]?.roiPercent ?? 0);
    expect(formatCtrDisplay(4.2)).toBe("4.2%");
    expect(formatRoiDisplay(230)).toBe("+230%");
  });
});

describe("AI promotion coach", () => {
  it("warns on views without orders", () => {
    const advice = buildPromotionAiAdvice({
      rows: [
        mockRow({
          performance: mockPerformance({ productViews: 80, orders: 0 }),
        }),
      ],
      topRecommendation: null,
    });
    expect(advice[0]?.headline).toContain("мало заказов");
  });
});

describe("permissions", () => {
  it("allows admin without seller profile", () => {
    expect(() =>
      assertSellerPromotionCenterAccess({ role: "ADMIN", sellerProfileId: null }),
    ).not.toThrow();
  });

  it("requires seller profile for sellers", () => {
    expect(() =>
      assertSellerPromotionCenterAccess({ role: "SELLER", sellerProfileId: null }),
    ).toThrow(SellerPromotionCenterForbiddenError);
  });

  it("requires admin for admin control", () => {
    expect(() => assertAdminPromotionControlAccess("SELLER")).toThrow(
      SellerPromotionCenterForbiddenError,
    );
    expect(() => assertAdminPromotionControlAccess("ADMIN")).not.toThrow();
  });
});
