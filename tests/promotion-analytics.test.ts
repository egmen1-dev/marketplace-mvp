import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  buildPromotionPerformanceSummary,
  calculatePromotionPerformanceScore,
  getCampaignMetricTotals,
  incrementPromotionMetric,
  ingestPromotionAnalyticsEvent,
  findActivePromotionAttribution,
} from "@/lib/promotion/analytics";
import { prisma } from "@/lib/prisma";

const PREV_ANALYTICS = process.env.PROMOTION_ANALYTICS_ENABLED;

describe("promotion analytics pipeline", () => {
  beforeEach(() => {
    process.env.PROMOTION_ANALYTICS_ENABLED = "true";
  });

  afterEach(() => {
    process.env.PROMOTION_ANALYTICS_ENABLED = PREV_ANALYTICS;
  });

  it("aggregates impression and click events", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true },
    });
    const product = await prisma.product.findFirst({
      where: { sellerId: seller?.id, status: "ACTIVE" },
      select: { id: true, name: true },
    });
    if (!seller || !product) return;

    const campaign = await prisma.promotionCampaign.create({
      data: {
        productId: product.id,
        sellerId: seller.id,
        status: "STARTED",
        startedAt: new Date(),
      },
    });

    try {
      await ingestPromotionAnalyticsEvent({
        event: ANALYTICS_EVENTS.PROMOTION_IMPRESSION,
        entityId: product.id,
        visitorId: "visitor-analytics-1",
      });
      await ingestPromotionAnalyticsEvent({
        event: ANALYTICS_EVENTS.PROMOTION_CLICK,
        entityId: product.id,
        visitorId: "visitor-analytics-1",
      });

      const totals = await getCampaignMetricTotals(campaign.id);
      expect(totals.impressions).toBe(1);
      expect(totals.clicks).toBe(1);
    } finally {
      await prisma.promotionMetric.deleteMany({ where: { campaignId: campaign.id } });
      await prisma.promotionAttribution.deleteMany({ where: { campaignId: campaign.id } });
      await prisma.promotionCampaign.delete({ where: { id: campaign.id } });
    }
  });

  it("attributes funnel events within 7-day window", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true },
    });
    const product = await prisma.product.findFirst({
      where: { sellerId: seller?.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!seller || !product) return;

    const campaign = await prisma.promotionCampaign.create({
      data: {
        productId: product.id,
        sellerId: seller.id,
        status: "STARTED",
        startedAt: new Date(),
      },
    });

    const visitorId = `visitor-funnel-${Date.now()}`;

    try {
      await ingestPromotionAnalyticsEvent({
        event: ANALYTICS_EVENTS.PROMOTION_CLICK,
        entityId: product.id,
        visitorId,
      });

      const active = await findActivePromotionAttribution({
        visitorId,
        productId: product.id,
      });
      expect(active?.campaignId).toBe(campaign.id);

      await ingestPromotionAnalyticsEvent({
        event: ANALYTICS_EVENTS.PRODUCT_VIEW,
        entityId: product.id,
        visitorId,
      });
      await ingestPromotionAnalyticsEvent({
        event: ANALYTICS_EVENTS.ADD_TO_CART,
        entityId: product.id,
        visitorId,
      });

      const totals = await getCampaignMetricTotals(campaign.id);
      expect(totals.productViews).toBe(1);
      expect(totals.addToCart).toBe(1);
    } finally {
      await prisma.promotionMetric.deleteMany({ where: { campaignId: campaign.id } });
      await prisma.promotionAttribution.deleteMany({ where: { campaignId: campaign.id } });
      await prisma.promotionCampaign.delete({ where: { id: campaign.id } });
    }
  });

  it("computes CTR and performance score", () => {
    const summary = buildPromotionPerformanceSummary({
      totals: {
        impressions: 100,
        clicks: 5,
        productViews: 20,
        addToCart: 3,
        checkoutStarted: 2,
        orders: 2,
        revenue: 15_000,
      },
      campaignBudget: null,
    });

    expect(summary.ctr).toBe(5);
    expect(summary.conversionRate).toBe(40);
    expect(summary.roiLabel).toBe("Стоимость продвижения не задана");
    expect(
      calculatePromotionPerformanceScore({
        impressions: 100,
        clicks: 5,
        productViews: 20,
        addToCart: 3,
        checkoutStarted: 2,
        orders: 2,
        revenue: 15_000,
      }),
    ).toBeGreaterThan(0);
  });

  it("increments metrics idempotently per day", async () => {
    const seller = await prisma.sellerProfile.findFirst({ select: { id: true } });
    const product = await prisma.product.findFirst({
      where: { sellerId: seller?.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!seller || !product) return;

    const campaign = await prisma.promotionCampaign.create({
      data: {
        productId: product.id,
        sellerId: seller.id,
        status: "STARTED",
      },
    });

    try {
      await incrementPromotionMetric({
        campaignId: campaign.id,
        productId: product.id,
        field: "impressions",
      });
      await incrementPromotionMetric({
        campaignId: campaign.id,
        productId: product.id,
        field: "impressions",
      });

      const totals = await getCampaignMetricTotals(campaign.id);
      expect(totals.impressions).toBe(2);
    } finally {
      await prisma.promotionMetric.deleteMany({ where: { campaignId: campaign.id } });
      await prisma.promotionCampaign.delete({ where: { id: campaign.id } });
    }
  });
});
