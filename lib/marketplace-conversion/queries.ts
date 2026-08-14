import { prisma } from "@/lib/prisma";
import { pctRate } from "@/lib/analytics/funnel-metrics";
import { computeProductCompletenessScore } from "@/lib/conversion/completeness";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";
import { getProductRatingSnapshot } from "@/lib/marketplace-trust-loop/ratings/product-rating";
import { isMarketplaceDeliveryEnabled } from "@/lib/marketplace-delivery/flags";

import { getBuyerConversionContext } from "./buyer-conversion";
import { detectFunnelDropOffs, detectProductDropOff } from "./drop-offs";
import {
  buildBuyerFunnelDisplay,
  funnelSummaryLine,
  type FunnelStepDisplay,
} from "./funnel";
import { isMarketplaceConversionEnabled } from "./flags";
import {
  adminGrowthOpportunity,
  recommendationsFromDropOff,
  type ConversionRecommendation,
} from "./recommendations";
import { getSellerConversionDashboard } from "./seller-conversion";
import type { SellerConversionDashboard } from "./seller-conversion";

export type AdminConversionCenter = {
  enabled: boolean;
  windowDays: number;
  since: Date;
  funnel: FunnelStepDisplay[];
  funnelSummary: string[];
  biggestProblems: ConversionRecommendation[];
  growthOpportunities: ConversionRecommendation[];
  dropOffs: ReturnType<typeof detectFunnelDropOffs>;
};

export type PdpConversionDiagnostics = {
  enabled: boolean;
  productId: string;
  views: number;
  cartAdds: number;
  viewToCartRate: number | null;
  signals: Array<{ type: "warning" | "ok"; text: string }>;
  recommendation: ConversionRecommendation | null;
};

function aggregateUniques(
  rows: Array<{ event: string; visitorId: string | null }>,
): Record<string, number> {
  const sets: Record<string, Set<string>> = {};
  for (const row of rows) {
    if (!row.visitorId) continue;
    if (!sets[row.event]) sets[row.event] = new Set();
    sets[row.event]!.add(row.visitorId);
  }
  const out: Record<string, number> = {};
  for (const [event, set] of Object.entries(sets)) {
    out[event] = set.size;
  }
  return out;
}

async function loadAnalyticsWindow(windowDays: number) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [grouped, visitorRows] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["event"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, visitorId: { not: null } },
      select: { event: true, visitorId: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    counts[row.event] = row._count._all;
  }

  const uniques = aggregateUniques(visitorRows);
  if (!uniques.page_view && counts.page_view) {
    uniques.page_view = counts.page_view;
  }

  return { since, counts, uniques };
}

export async function getAdminConversionCenter(
  windowDays = 7,
): Promise<AdminConversionCenter> {
  if (!isMarketplaceConversionEnabled()) {
    return {
      enabled: false,
      windowDays,
      since: new Date(),
      funnel: [],
      funnelSummary: [],
      biggestProblems: [],
      growthOpportunities: [],
      dropOffs: [],
    };
  }

  const { since, counts, uniques } = await loadAnalyticsWindow(windowDays);
  const funnel = buildBuyerFunnelDisplay({ counts, uniques });
  const dropOffs = detectFunnelDropOffs(funnel);
  const biggestProblems = dropOffs.map((d) => recommendationsFromDropOff(d));

  const [viewGroups, purchaseGroups, products] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["entityId"],
      where: {
        event: "product_view",
        createdAt: { gte: since },
        entityId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { entityId: "desc" } },
      take: 30,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["entityId"],
      where: {
        event: "purchase_complete",
        createdAt: { gte: since },
        entityId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, category: { select: { name: true } } },
      take: 200,
    }),
  ]);

  const purchasesByProduct = new Map(
    purchaseGroups
      .filter((g) => g.entityId)
      .map((g) => [g.entityId!, g._count._all]),
  );
  const titleById = new Map(products.map((p) => [p.id, p.name]));

  const growthOpportunities = viewGroups
    .filter((g) => g.entityId)
    .map((g) =>
      adminGrowthOpportunity({
        productId: g.entityId!,
        title: titleById.get(g.entityId!) ?? g.entityId!.slice(0, 8),
        views: g._count._all,
        purchases: purchasesByProduct.get(g.entityId!) ?? 0,
      }),
    )
    .filter((r): r is ConversionRecommendation => r != null)
    .slice(0, 5);

  const categoryViews = new Map<string, number>();
  for (const g of viewGroups) {
    if (!g.entityId) continue;
    const product = products.find((p) => p.id === g.entityId);
    const cat = product?.category?.name ?? "Без категории";
    categoryViews.set(cat, (categoryViews.get(cat) ?? 0) + g._count._all);
  }
  for (const [cat, views] of categoryViews) {
    if (views >= 50) {
      biggestProblems.push({
        id: `category-${cat}`,
        problem: `Категория «${cat}»: низкая конверсия`,
        why: "Много просмотров в категории — проверьте качество карточек",
        data: `${views} просмотров за ${windowDays} дн.`,
        action: "Проверьте фото, цены и отзывы в категории",
      });
    }
  }

  const newSellers = await prisma.sellerProfile.count({
    where: {
      createdAt: { gte: since },
      products: { none: { orderItems: { some: {} } } },
    },
  });
  if (newSellers > 0) {
    biggestProblems.push({
      id: "new-sellers",
      problem: "Новые продавцы: мало первых продаж",
      why: "Активация продавцов не завершена",
      data: `${newSellers} продавцов без продаж`,
      action: "Направьте в Seller Journey и Promotion Center",
    });
  }

  return {
    enabled: true,
    windowDays,
    since,
    funnel,
    funnelSummary: funnelSummaryLine(funnel),
    biggestProblems: biggestProblems.slice(0, 5),
    growthOpportunities,
    dropOffs,
  };
}

export async function getPdpConversionDiagnostics(
  productId: string,
  windowDays = 30,
): Promise<PdpConversionDiagnostics> {
  if (!isMarketplaceConversionEnabled()) {
    return {
      enabled: false,
      productId,
      views: 0,
      cartAdds: 0,
      viewToCartRate: null,
      signals: [],
      recommendation: null,
    };
  }

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [product, viewCount, cartCount, categoryAvg] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        categoryId: true,
        productTypeId: true,
        sellerId: true,
        category: { select: { name: true } },
        _count: { select: { images: true, characteristicValues: true, reviews: true } },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        event: "product_view",
        entityId: productId,
        createdAt: { gte: since },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        event: "add_to_cart",
        entityId: productId,
        createdAt: { gte: since },
      },
    }),
    prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    }).then(async (p) =>
      p?.categoryId
        ? prisma.product.aggregate({
            where: { status: "ACTIVE", categoryId: p.categoryId },
            _avg: { price: true },
          })
        : { _avg: { price: null } },
    ),
  ]);

  if (!product) {
    return {
      enabled: true,
      productId,
      views: 0,
      cartAdds: 0,
      viewToCartRate: null,
      signals: [],
      recommendation: null,
    };
  }

  const views = viewCount || 0;
  const cartAdds = cartCount;
  const viewToCartRate = pctRate(cartAdds, views);

  const signals: PdpConversionDiagnostics["signals"] = [];
  const avgPrice = Number(categoryAvg._avg?.price ?? 0);
  const price = Number(product.price);
  if (avgPrice > 0 && price > avgPrice * 1.25) {
    signals.push({
      type: "warning",
      text: "⚠️ Цена выше средней категории",
    });
  }

  if (product._count.images < 3) {
    signals.push({ type: "warning", text: "⚠️ Мало фотографий" });
  } else {
    signals.push({ type: "ok", text: "✓ Достаточно фото" });
  }

  if (isMarketplaceTrustLoopEnabled()) {
    const rating = await getProductRatingSnapshot(productId);
    if (!rating || rating.reviewsCount === 0) {
      signals.push({ type: "warning", text: "⚠️ Нет отзывов" });
    } else {
      signals.push({
        type: "ok",
        text: `✓ Рейтинг ${rating.averageRating.toFixed(1)}`,
      });
    }
  } else if (product._count.reviews === 0) {
    signals.push({ type: "warning", text: "⚠️ Нет отзывов" });
  }

  if (isMarketplaceDeliveryEnabled()) {
    signals.push({ type: "ok", text: "✓ Доставка настроена" });
  }

  const completeness = computeProductCompletenessScore({
    photoCount: product._count.images,
    titleLength: product.name.trim().length,
    descriptionLength: (product.description ?? "").trim().length,
    characteristicCount: product._count.characteristicValues,
    hasCategory: Boolean(product.categoryId),
    hasProductType: Boolean(product.productTypeId),
    price,
    hasSeller: Boolean(product.sellerId),
  });
  if (completeness.score < 70) {
    signals.push({ type: "warning", text: "⚠️ Неполное описание" });
  }

  const drop = detectProductDropOff({ views, addToCart: cartAdds, minViews: 5 });
  const recommendation = drop
    ? recommendationsFromDropOff(drop, productId)
    : null;

  return {
    enabled: true,
    productId,
    views,
    cartAdds,
    viewToCartRate,
    signals,
    recommendation,
  };
}

export {
  getBuyerConversionContext,
  getSellerConversionDashboard,
  type SellerConversionDashboard,
};
