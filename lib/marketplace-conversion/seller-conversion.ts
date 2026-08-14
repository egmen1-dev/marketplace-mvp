import { prisma } from "@/lib/prisma";
import { getSellerDashboardStats } from "@/features/seller/queries";
import { computeProductCompletenessScore } from "@/lib/conversion/completeness";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";

import { detectProductDropOff } from "./drop-offs";
import { buildBuyerFunnelDisplay, type FunnelStepDisplay } from "./funnel";
import { isMarketplaceConversionEnabled } from "./flags";
import {
  recommendationsFromDropOff,
  sellerConversionRecommendation,
  type ConversionRecommendation,
} from "./recommendations";

export type SellerConversionDashboard = {
  enabled: boolean;
  windowDays: number;
  views: number;
  cartAdds: number;
  orders: number;
  checkoutStarts: number;
  purchases: number;
  viewToCartRate: number | null;
  blockers: string[];
  recommendations: ConversionRecommendation[];
  funnelSteps: FunnelStepDisplay[];
};

export async function getSellerConversionDashboard(
  sellerProfileId: string,
  windowDays = 30,
): Promise<SellerConversionDashboard> {
  if (!isMarketplaceConversionEnabled()) {
    return {
      enabled: false,
      windowDays,
      views: 0,
      cartAdds: 0,
      orders: 0,
      checkoutStarts: 0,
      purchases: 0,
      viewToCartRate: null,
      blockers: [],
      recommendations: [],
      funnelSteps: [],
    };
  }

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [stats, products, cartGroups, viewGroups, analyticsGrouped] =
    await Promise.all([
    getSellerDashboardStats(sellerProfileId),
    prisma.product.findMany({
      where: { sellerId: sellerProfileId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        views: true,
        price: true,
        description: true,
        categoryId: true,
        productTypeId: true,
        sellerId: true,
        _count: { select: { images: true, characteristicValues: true, reviews: true } },
      },
      orderBy: { views: "desc" },
      take: 20,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["entityId"],
      where: {
        event: "add_to_cart",
        createdAt: { gte: since },
        entityId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["entityId"],
      where: {
        event: "product_view",
        createdAt: { gte: since },
        entityId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["event"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const eventCounts: Record<string, number> = {};
  for (const row of analyticsGrouped) {
    eventCounts[row.event] = row._count._all;
  }

  const funnelSteps = buildBuyerFunnelDisplay({
    counts: {
      page_view: eventCounts.page_view ?? stats.viewsSum,
      product_view: eventCounts.product_view ?? stats.viewsSum,
      add_to_cart: eventCounts.add_to_cart ?? 0,
      checkout_start: eventCounts.checkout_start ?? 0,
      purchase_complete: eventCounts.purchase_complete ?? stats.ordersCount,
    },
    uniques: {
      page_view: eventCounts.page_view ?? stats.viewsSum,
      product_view: eventCounts.product_view ?? stats.viewsSum,
      add_to_cart: eventCounts.add_to_cart ?? 0,
      checkout_start: eventCounts.checkout_start ?? 0,
      purchase_complete: eventCounts.purchase_complete ?? stats.ordersCount,
    },
  });

  const productIds = new Set(products.map((p) => p.id));
  const cartByProduct = new Map(
    cartGroups
      .filter((g) => g.entityId && productIds.has(g.entityId))
      .map((g) => [g.entityId!, g._count._all]),
  );
  const viewsByProduct = new Map(
    viewGroups
      .filter((g) => g.entityId && productIds.has(g.entityId))
      .map((g) => [g.entityId!, g._count._all]),
  );

  let cartAdds = 0;
  let analyticsViews = 0;
  for (const id of productIds) {
    cartAdds += cartByProduct.get(id) ?? 0;
    analyticsViews += viewsByProduct.get(id) ?? 0;
  }

  const views = analyticsViews > 0 ? analyticsViews : stats.viewsSum;
  const viewToCartRate =
    views > 0 ? Math.round((cartAdds / views) * 1000) / 10 : null;

  const blockers: string[] = [];
  if (views >= 20 && (viewToCartRate ?? 0) < 10) {
    blockers.push("Много просмотров без заказов");
  }

  const lowPhoto = products.filter((p) => p._count.images < 2);
  if (lowPhoto.length > 0) {
    blockers.push("Карточкам не хватает фото");
  }

  if (isMarketplaceTrustLoopEnabled()) {
    const noReviews = products.filter((p) => p._count.reviews === 0);
    if (noReviews.length >= Math.ceil(products.length / 2) && products.length > 0) {
      blockers.push("Нет отзывов");
    }
  }

  const recommendations: ConversionRecommendation[] = [];
  const top = products[0];
  const sellerRec = sellerConversionRecommendation({
    views,
    cartAdds,
    orders: stats.ordersCount,
    topProductId: top?.id,
    topProductName: top?.name,
  });
  if (sellerRec) recommendations.push(sellerRec);

  if (top) {
    const topViews = viewsByProduct.get(top.id) ?? top.views;
    const topCart = cartByProduct.get(top.id) ?? 0;
    const drop = detectProductDropOff({ views: topViews, addToCart: topCart });
    if (drop) {
      recommendations.push(recommendationsFromDropOff(drop, top.id));
    }
  }

  for (const p of products.slice(0, 5)) {
    const completeness = computeProductCompletenessScore({
      photoCount: p._count.images,
      titleLength: p.name.trim().length,
      descriptionLength: (p.description ?? "").trim().length,
      characteristicCount: p._count.characteristicValues,
      hasCategory: Boolean(p.categoryId),
      hasProductType: Boolean(p.productTypeId),
      price: Number(p.price),
      hasSeller: Boolean(p.sellerId),
    });
    if (completeness.score < 70 && !recommendations.some((r) => r.ctaHref?.includes(p.id))) {
      recommendations.push({
        id: `quality-${p.id}`,
        problem: `Низкое качество карточки «${p.name}»`,
        why: "Неполное описание снижает конверсию",
        data: `Quality score ${completeness.score}/100`,
        action: completeness.improvements[0] ?? "Добавьте фото и описание",
        ctaLabel: "Исправить",
        ctaHref: `/account/products/${p.id}/edit`,
      });
    }
  }

  return {
    enabled: true,
    windowDays,
    views,
    cartAdds,
    orders: stats.ordersCount,
    checkoutStarts: eventCounts.checkout_start ?? 0,
    purchases: stats.ordersCount,
    viewToCartRate,
    blockers: blockers.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
    funnelSteps,
  };
}
