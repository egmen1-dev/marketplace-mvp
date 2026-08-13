import { ProductStatus } from "@prisma/client";

import { listLowCompletenessProducts } from "@/lib/conversion/queries";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { prisma } from "@/lib/prisma";

import type { CommunicationAudience, AudienceKind } from "./types";

const AUDIENCE_META: Record<
  AudienceKind,
  { label: string; description: string; source: string }
> = {
  SELLERS_WITHOUT_PROMOTION: {
    label: "Продавцы без продвижения",
    description: "Активные SKU без promotion campaign",
    source: "seller_growth + promotion",
  },
  SELLERS_LOW_QUALITY_PRODUCTS: {
    label: "Продавцы со слабыми карточками",
    description: "Completeness score ниже порога",
    source: "product_quality + execution",
  },
  SELLERS_NO_SALES_30_DAYS: {
    label: "Продавцы без продаж 30 дней",
    description: "Просмотры есть, заказов нет",
    source: "marketplace_intelligence",
  },
  BUYERS_ABANDONED_CART: {
    label: "Покупатели с брошенной корзиной",
    description: "Cart items без checkout (signals)",
    source: "analytics.funnel",
  },
  BUYERS_CATEGORY_INTEREST: {
    label: "Покупатели с интересом к категории",
    description: "SEARCH_USED + PRODUCT_VIEW по категории",
    source: "buyer_intelligence",
  },
};

async function countSellersWithoutPromotion(): Promise<number> {
  return prisma.sellerProfile.count({
    where: {
      isBlocked: false,
      products: {
        some: {
          status: ProductStatus.ACTIVE,
          promotionCampaign: null,
        },
      },
    },
  });
}

async function countSellersNoSales(): Promise<number> {
  return prisma.product.count({
    where: {
      status: ProductStatus.ACTIVE,
      views: { gte: 10 },
      orderItems: { none: {} },
    },
  });
}

async function countAbandonedCartSignals(): Promise<number> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["visitorId"],
    where: {
      event: ANALYTICS_EVENTS.ADD_TO_CART,
      createdAt: { gte: since },
      visitorId: { not: null },
    },
    _count: { _all: true },
  });
  return rows.length;
}

async function countCategoryInterest(): Promise<number> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  return prisma.analyticsEvent.count({
    where: {
      event: ANALYTICS_EVENTS.SEARCH_USED,
      createdAt: { gte: since },
    },
  });
}

/** Build audiences from existing growth/intelligence/execution signals. */
export async function buildCommunicationAudiences(): Promise<
  CommunicationAudience[]
> {
  const [lowQuality, noPromo, noSales, abandoned, categoryInterest] =
    await Promise.all([
      listLowCompletenessProducts(100),
      countSellersWithoutPromotion(),
      countSellersNoSales(),
      countAbandonedCartSignals(),
      countCategoryInterest(),
    ]);

  const sellerLowQuality = new Set(
    (
      await prisma.product.findMany({
        where: {
          id: { in: lowQuality.map((p) => p.id) },
        },
        select: { sellerId: true },
        distinct: ["sellerId"],
      })
    ).map((p) => p.sellerId),
  ).size;

  const items: Array<{ kind: AudienceKind; size: number }> = [
    { kind: "SELLERS_LOW_QUALITY_PRODUCTS", size: sellerLowQuality },
    { kind: "SELLERS_WITHOUT_PROMOTION", size: noPromo },
    { kind: "SELLERS_NO_SALES_30_DAYS", size: noSales },
    { kind: "BUYERS_ABANDONED_CART", size: abandoned },
    { kind: "BUYERS_CATEGORY_INTEREST", size: Math.min(categoryInterest, 500) },
  ];

  return items
    .filter((i) => i.size > 0)
    .map((item, index) => {
      const meta = AUDIENCE_META[item.kind];
      return {
        id: `audience-${index}`,
        kind: item.kind,
        label: meta.label,
        description: meta.description,
        estimatedSize: item.size,
        source: meta.source,
      };
    });
}

export function pickAudienceForCampaignType(
  audiences: CommunicationAudience[],
  type: import("./types").CampaignType,
): CommunicationAudience | null {
  const preference: Record<
    import("./types").CampaignType,
    AudienceKind[]
  > = {
    SELLER_ACTIVATION: ["SELLERS_NO_SALES_30_DAYS", "SELLERS_WITHOUT_PROMOTION"],
    PRODUCT_IMPROVEMENT: ["SELLERS_LOW_QUALITY_PRODUCTS"],
    PROMOTION_INVITE: ["SELLERS_WITHOUT_PROMOTION"],
    CATEGORY_GROWTH: ["BUYERS_CATEGORY_INTEREST"],
    BUYER_REACTIVATION: ["BUYERS_ABANDONED_CART", "BUYERS_CATEGORY_INTEREST"],
  };

  for (const kind of preference[type]) {
    const found = audiences.find((a) => a.kind === kind);
    if (found) return found;
  }
  return audiences[0] ?? null;
}
