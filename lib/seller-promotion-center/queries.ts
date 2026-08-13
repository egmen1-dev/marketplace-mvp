import { PromotionCampaignStatus } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import {
  generatePromotionRecommendations,
  isPromotionBillingEnabled,
  isPromotionIntelligenceEnabled,
  listActivePromotionPlans,
  listSellerPromotionRows,
} from "@/lib/promotion";
import { getAdminPromotionBillingSummary } from "@/lib/promotion/billing/queries";
import { prisma } from "@/lib/prisma";

import { buildCampaignCards } from "./campaigns";
import { buildSummaryFromRows, emptySummary } from "./dashboard";
import { isSellerPromotionCenterEnabled } from "./flags";
import { buildSmartBudgetRecommendation } from "./budget";
import { buildPromotionAiAdvice, lowPerformanceCampaigns } from "./insights";
import {
  buildAnalyticsDetail,
  buildCampaignComparison,
} from "./performance";
import { enrichOpportunities } from "./recommendations";
import type {
  AdminPromotionControlExtension,
  PromotionCenterNotification,
  SellerPromotionCenterDashboard,
} from "./types";

export async function getSellerPromotionCenterDashboard(
  sellerProfileId: string,
): Promise<SellerPromotionCenterDashboard> {
  const billingEnabled = isPromotionBillingEnabled();
  const intelligenceEnabled = isPromotionIntelligenceEnabled();

  if (!isSellerPromotionCenterEnabled()) {
    return {
      enabled: false,
      title: "Продвижение товаров",
      summary: emptySummary(),
      opportunities: [],
      campaigns: [],
      budgetRecommendation: null,
      analytics: {
        funnel: [],
        metrics: {
          impressions: 0,
          clicks: 0,
          ctr: 0,
          conversionRate: 0,
          orders: 0,
          revenue: 0,
        },
      },
      aiAdvice: [],
      comparison: [],
      plans: [],
      rows: [],
      billingEnabled,
      intelligenceEnabled,
    };
  }

  const [rows, plans, recommendationsPayload] = await Promise.all([
    listSellerPromotionRows(sellerProfileId),
    billingEnabled ? listActivePromotionPlans() : Promise.resolve([]),
    intelligenceEnabled
      ? generatePromotionRecommendations(sellerProfileId)
      : Promise.resolve(null),
  ]);

  const imageByProductId = new Map(
    rows.map((r) => [r.productId, r.imageUrl] as const),
  );
  const priceByProductId = new Map(
    rows.map((r) => [r.productId, { price: r.price, currency: r.currency }] as const),
  );

  const recommendations = recommendationsPayload?.recommendations ?? [];
  const topRec =
    recommendations.find((r) => r.ready && !r.isPromoted) ?? recommendations[0] ?? null;

  return {
    enabled: true,
    title: "Продвижение товаров",
    summary: buildSummaryFromRows(rows),
    opportunities: enrichOpportunities({
      recommendations,
      imageByProductId,
      priceByProductId,
    }),
    campaigns: buildCampaignCards(rows),
    budgetRecommendation: buildSmartBudgetRecommendation({
      topRecommendation: topRec,
      plans: plans.length > 0 ? plans : recommendationsPayload?.plans ?? [],
    }),
    analytics: buildAnalyticsDetail(rows),
    aiAdvice: buildPromotionAiAdvice({ rows, topRecommendation: topRec }),
    comparison: buildCampaignComparison(rows),
    plans,
    rows,
    billingEnabled,
    intelligenceEnabled,
  };
}

export async function getAdminPromotionControlExtension(): Promise<AdminPromotionControlExtension> {
  if (!isSellerPromotionCenterEnabled()) {
    return {
      enabled: false,
      adSpendTotal: 0,
      platformRevenue: 0,
      activeSellers: 0,
      topCategories: [],
      sellerRows: [],
    };
  }

  const billing = await getAdminPromotionBillingSummary();

  const sellerAgg = await prisma.promotionOrder.groupBy({
    by: ["sellerId"],
    where: { status: { in: ["PAID", "ACTIVE", "ENDED"] } },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const sellerIds = sellerAgg.map((s) => s.sellerId);
  const sellers = await prisma.sellerProfile.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, storeName: true },
  });
  const sellerNameMap = new Map(sellers.map((s) => [s.id, s.storeName]));

  const metrics = await prisma.promotionMetric.groupBy({
    by: ["campaignId"],
    _sum: { orders: true, revenue: true },
  });

  const campaigns = await prisma.promotionCampaign.findMany({
    where: { sellerId: { in: sellerIds } },
    select: { id: true, sellerId: true },
  });
  const campaignSeller = new Map(campaigns.map((c) => [c.id, c.sellerId]));

  const gmvBySeller = new Map<string, number>();
  for (const m of metrics) {
    const sellerId = campaignSeller.get(m.campaignId);
    if (!sellerId) continue;
    gmvBySeller.set(
      sellerId,
      (gmvBySeller.get(sellerId) ?? 0) +
        (m._sum.revenue ? toPriceNumber(m._sum.revenue) : 0),
    );
  }

  const campaignCounts = await prisma.promotionCampaign.groupBy({
    by: ["sellerId"],
    where: { status: PromotionCampaignStatus.STARTED },
    _count: { _all: true },
  });
  const activeCampaignMap = new Map(
    campaignCounts.map((c) => [c.sellerId, c._count._all]),
  );

  const sellerRows = sellerAgg
    .map((row) => {
      const spend = row._sum.amount ? toPriceNumber(row._sum.amount) : 0;
      const gmv = gmvBySeller.get(row.sellerId) ?? 0;
      const roi =
        spend > 0 ? ((gmv - spend) / spend) * 100 : null;
      return {
        sellerId: row.sellerId,
        sellerName: sellerNameMap.get(row.sellerId) ?? row.sellerId,
        spend,
        gmv,
        roiPercent: roi,
        campaignCount: activeCampaignMap.get(row.sellerId) ?? row._count._all,
      };
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 20);

  const topCategories = await prisma.product.groupBy({
    by: ["categoryId"],
    where: {
      promotionCampaign: { status: PromotionCampaignStatus.STARTED },
      categoryId: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { categoryId: "desc" } },
    take: 5,
  });

  const categoryIds = topCategories
    .map((c) => c.categoryId)
    .filter((id): id is string => Boolean(id));
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryNames = categories.map((c) => c.name);

  return {
    enabled: true,
    adSpendTotal: billing.totalRevenue,
    platformRevenue: billing.totalRevenue,
    activeSellers: sellerIds.length,
    topCategories: categoryNames,
    sellerRows,
  };
}

export async function getPromotionCenterNotifications(input: {
  sellerProfileId: string;
}): Promise<PromotionCenterNotification[]> {
  if (!isSellerPromotionCenterEnabled()) return [];

  const dashboard = await getSellerPromotionCenterDashboard(input.sellerProfileId);
  const now = new Date().toISOString();
  const notifications: PromotionCenterNotification[] = [];

  for (const row of dashboard.rows.filter((r) => r.isPromoted).slice(0, 2)) {
    notifications.push({
      id: `promo-started-${row.productId}`,
      type: "PROMOTION_STARTED",
      title: `Продвижение запущено: ${row.title}`,
      body: row.performance?.roiLabel ?? "Кампания активна",
      href: ROUTES.ACCOUNT_PROMOTION_CENTER,
      createdAt: now,
      read: false,
    });
  }

  for (const row of dashboard.rows
    .filter((r) => r.performance && r.performance.orders > 0)
    .slice(0, 2)) {
    notifications.push({
      id: `promo-result-${row.productId}`,
      type: "PROMOTION_RESULT",
      title: `Результат: ${row.title}`,
      body: `${row.performance!.orders} заказов · ${row.performance!.roiLabel}`,
      href: ROUTES.ACCOUNT_PROMOTION_CENTER,
      createdAt: now,
      read: false,
    });
  }

  const lowRows = lowPerformanceCampaigns(dashboard.rows);
  for (const row of lowRows.slice(0, 2)) {
    notifications.push({
      id: `promo-low-${row.productId}`,
      type: "PROMOTION_LOW_PERFORMANCE",
      title: `Низкая эффективность: ${row.title}`,
      body: "Много показов, мало заказов — улучшите карточку",
      href: ROUTES.ACCOUNT_PROMOTION_CENTER,
      createdAt: now,
      read: false,
    });
  }

  for (const opp of dashboard.opportunities.slice(0, 2)) {
    notifications.push({
      id: `promo-opp-${opp.productId}`,
      type: "PROMOTION_OPPORTUNITY",
      title: `Стоит продвигать: ${opp.title}`,
      body: `Шанс роста ${opp.promotionScore}/100`,
      href: ROUTES.ACCOUNT_PROMOTION_CENTER,
      createdAt: now,
      read: false,
    });
  }

  return notifications.slice(0, 8);
}
