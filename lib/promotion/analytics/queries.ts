import { PromotionCampaignStatus, Prisma } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import {
  buildPromotionPerformanceSummary,
  sumPromotionMetrics,
} from "@/lib/promotion/analytics/score";
import type {
  AdminCampaignAnalyticsRow,
  AdminPromotionAnalyticsSummary,
  PromotionMetricTotals,
  PromotionPerformanceSummary,
} from "@/lib/promotion/analytics/types";
import { EMPTY_METRIC_TOTALS } from "@/lib/promotion/analytics/types";
import { isPromotionAnalyticsEnabled } from "@/lib/promotion/analytics/flags";
import { getPromotionCostForCampaign } from "@/lib/promotion/billing/orders";
import { prisma } from "@/lib/prisma";

function mapMetricRow(row: {
  impressions: number;
  clicks: number;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  orders: number;
  revenue: Prisma.Decimal;
}): PromotionMetricTotals {
  return {
    impressions: row.impressions,
    clicks: row.clicks,
    productViews: row.productViews,
    addToCart: row.addToCart,
    checkoutStarted: row.checkoutStarted,
    orders: row.orders,
    revenue: toPriceNumber(row.revenue),
  };
}

export async function getCampaignMetricTotals(
  campaignId: string,
): Promise<PromotionMetricTotals> {
  const aggregate = await prisma.promotionMetric.aggregate({
    where: { campaignId },
    _sum: {
      impressions: true,
      clicks: true,
      productViews: true,
      addToCart: true,
      checkoutStarted: true,
      orders: true,
      revenue: true,
    },
  });

  if (!aggregate._sum.impressions && !aggregate._sum.clicks) {
    return { ...EMPTY_METRIC_TOTALS };
  }

  return {
    impressions: aggregate._sum.impressions ?? 0,
    clicks: aggregate._sum.clicks ?? 0,
    productViews: aggregate._sum.productViews ?? 0,
    addToCart: aggregate._sum.addToCart ?? 0,
    checkoutStarted: aggregate._sum.checkoutStarted ?? 0,
    orders: aggregate._sum.orders ?? 0,
    revenue: aggregate._sum.revenue
      ? toPriceNumber(aggregate._sum.revenue)
      : 0,
  };
}

export async function getCampaignPerformanceSummary(
  campaignId: string,
): Promise<PromotionPerformanceSummary | null> {
  if (!isPromotionAnalyticsEnabled()) return null;

  const campaign = await prisma.promotionCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });
  if (!campaign) return null;

  const totals = await getCampaignMetricTotals(campaignId);
  const promotionCost = await getPromotionCostForCampaign(campaignId);
  return buildPromotionPerformanceSummary({
    totals,
    promotionCost,
  });
}

export async function getSellerCampaignPerformanceMap(
  campaignIds: string[],
): Promise<Map<string, PromotionPerformanceSummary>> {
  const map = new Map<string, PromotionPerformanceSummary>();
  if (!isPromotionAnalyticsEnabled() || campaignIds.length === 0) {
    return map;
  }

  const campaigns = await prisma.promotionCampaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true },
  });

  const costEntries = await Promise.all(
    campaigns.map(async (campaign) => [
      campaign.id,
      await getPromotionCostForCampaign(campaign.id),
    ] as const),
  );
  const costMap = new Map(costEntries);

  const metrics = await prisma.promotionMetric.groupBy({
    by: ["campaignId"],
    where: { campaignId: { in: campaignIds } },
    _sum: {
      impressions: true,
      clicks: true,
      productViews: true,
      addToCart: true,
      checkoutStarted: true,
      orders: true,
      revenue: true,
    },
  });

  const metricMap = new Map(metrics.map((m) => [m.campaignId, m]));

  for (const campaign of campaigns) {
    const agg = metricMap.get(campaign.id);
    const totals = agg
      ? {
          impressions: agg._sum.impressions ?? 0,
          clicks: agg._sum.clicks ?? 0,
          productViews: agg._sum.productViews ?? 0,
          addToCart: agg._sum.addToCart ?? 0,
          checkoutStarted: agg._sum.checkoutStarted ?? 0,
          orders: agg._sum.orders ?? 0,
          revenue: agg._sum.revenue
            ? toPriceNumber(agg._sum.revenue)
            : 0,
        }
      : { ...EMPTY_METRIC_TOTALS };

    map.set(
      campaign.id,
      buildPromotionPerformanceSummary({
        totals,
        promotionCost: costMap.get(campaign.id) ?? 0,
      }),
    );
  }

  return map;
}

export async function getAdminPromotionAnalytics(): Promise<{
  summary: AdminPromotionAnalyticsSummary;
  rows: AdminCampaignAnalyticsRow[];
}> {
  if (!isPromotionAnalyticsEnabled()) {
    return {
      summary: {
        ...EMPTY_METRIC_TOTALS,
        activeCampaigns: 0,
        ctr: 0,
      },
      rows: [],
    };
  }

  const activeCampaigns = await prisma.promotionCampaign.count({
    where: { status: PromotionCampaignStatus.STARTED },
  });

  const aggregate = await prisma.promotionMetric.aggregate({
    _sum: {
      impressions: true,
      clicks: true,
      productViews: true,
      addToCart: true,
      checkoutStarted: true,
      orders: true,
      revenue: true,
    },
  });

  const totals: PromotionMetricTotals = {
    impressions: aggregate._sum.impressions ?? 0,
    clicks: aggregate._sum.clicks ?? 0,
    productViews: aggregate._sum.productViews ?? 0,
    addToCart: aggregate._sum.addToCart ?? 0,
    checkoutStarted: aggregate._sum.checkoutStarted ?? 0,
    orders: aggregate._sum.orders ?? 0,
    revenue: aggregate._sum.revenue
      ? toPriceNumber(aggregate._sum.revenue)
      : 0,
  };

  const campaigns = await prisma.promotionCampaign.findMany({
    include: {
      product: { select: { id: true, name: true } },
      seller: { select: { storeName: true } },
      metrics: {
        select: {
          impressions: true,
          clicks: true,
          productViews: true,
          addToCart: true,
          checkoutStarted: true,
          orders: true,
          revenue: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const rows: AdminCampaignAnalyticsRow[] = campaigns.map((c) => {
    const summed = sumPromotionMetrics(c.metrics.map(mapMetricRow));
    return {
      campaignId: c.id,
      productId: c.productId,
      productTitle: c.product.name,
      sellerName: c.seller.storeName,
      impressions: summed.impressions,
      clicks: summed.clicks,
      productViews: summed.productViews,
      orders: summed.orders,
    };
  });

  return {
    summary: {
      ...totals,
      activeCampaigns,
      ctr:
        totals.impressions > 0
          ? (totals.clicks / totals.impressions) * 100
          : 0,
    },
    rows,
  };
}
