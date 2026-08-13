import { ProductStatus } from "@prisma/client";

import { getConversionDashboard } from "@/lib/conversion/queries";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { parseBuyerIntent } from "@/lib/buyer-intelligence/intent-parser";
import { prisma } from "@/lib/prisma";
import { isSellerGrowthEnabled } from "@/lib/seller-growth/flags";
import { getAdminSellerGrowthOverview } from "@/lib/seller-growth/queries";

import type { MarketplaceSignal } from "./types";

function pushSignal(
  list: MarketplaceSignal[],
  signal: MarketplaceSignal,
): void {
  list.push(signal);
}

/** Aggregate advisory signals from buyer, seller, product, promotion, finance layers. */
export async function collectMarketplaceSignals(): Promise<MarketplaceSignal[]> {
  const signals: MarketplaceSignal[] = [];
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [searches, conversion, sellerOverview, zeroSaleViews] =
    await Promise.all([
      prisma.analyticsEvent.findMany({
        where: {
          event: ANALYTICS_EVENTS.SEARCH_USED,
          createdAt: { gte: since },
        },
        select: { entityId: true },
        take: 5000,
      }),
      getConversionDashboard(30),
      isSellerGrowthEnabled()
        ? getAdminSellerGrowthOverview()
        : Promise.resolve(null),
      prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          views: { gte: 10 },
          orderItems: { none: {} },
        },
        select: { id: true, category: { select: { name: true } } },
        take: 500,
      }),
    ]);

  const queryCounts = new Map<string, number>();
  const categorySearchCounts = new Map<string, number>();

  for (const row of searches) {
    const q = row.entityId?.trim();
    if (!q || q.length < 2) continue;
    queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
    const intent = parseBuyerIntent(q);
    if (intent.category) {
      categorySearchCounts.set(
        intent.category,
        (categorySearchCounts.get(intent.category) ?? 0) + 1,
      );
    }
  }

  const topQueries = [...queryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  for (const [query, count] of topQueries) {
    if (count < 2) continue;
    const intent = parseBuyerIntent(query);
    pushSignal(signals, {
      type: "BUYER_DEMAND",
      category: intent.category,
      severity: count >= 10 ? "HIGH" : count >= 5 ? "MEDIUM" : "LOW",
      message: `Покупатели ищут «${query}» (${count}×)`,
      metric: count,
      source: "analytics.search_used",
    });
  }

  for (const [category, count] of [...categorySearchCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)) {
    pushSignal(signals, {
      type: "CATEGORY_TREND",
      category,
      severity: count >= 20 ? "HIGH" : count >= 8 ? "MEDIUM" : "LOW",
      message: `Рост интереса к категории «${category}» — ${count} поисков за 30 дней`,
      metric: count,
      source: "analytics.category_search",
    });
  }

  if (sellerOverview) {
    if (sellerOverview.highPotentialProducts > 0) {
      pushSignal(signals, {
        type: "SELLER_GROWTH",
        category: null,
        severity: "MEDIUM",
        message: `${sellerOverview.highPotentialProducts} товаров с высоким потенциалом роста`,
        metric: sellerOverview.highPotentialProducts,
        source: "seller_growth.overview",
      });
    }
    if (sellerOverview.sellersWithUnpromotedReadyProducts > 0) {
      pushSignal(signals, {
        type: "PROMOTION_OPPORTUNITY",
        category: null,
        severity: "MEDIUM",
        message: `${sellerOverview.sellersWithUnpromotedReadyProducts} продавцов с готовыми к продвижению товарами`,
        metric: sellerOverview.sellersWithUnpromotedReadyProducts,
        source: "seller_growth.promotion_ready",
      });
    }
    if (sellerOverview.atRiskSellers.length > 0) {
      pushSignal(signals, {
        type: "SELLER_GROWTH",
        category: null,
        severity: "HIGH",
        message: `${sellerOverview.atRiskSellers.length} продавцов требуют внимания`,
        metric: sellerOverview.atRiskSellers.length,
        source: "seller_growth.at_risk",
      });
    }
  }

  const topUnmet = topQueries[0];
  if (topUnmet) {
    const [query, count] = topUnmet;
    const intent = parseBuyerIntent(query);
    const activeInCategory = intent.category
      ? await prisma.product.count({
          where: {
            status: ProductStatus.ACTIVE,
            category: {
              name: { equals: intent.category, mode: "insensitive" },
            },
          },
        })
      : null;

    if (activeInCategory != null && activeInCategory < Math.max(3, count / 4)) {
      pushSignal(signals, {
        type: "PRODUCT_GAP",
        category: intent.category,
        severity: count >= 8 ? "HIGH" : "MEDIUM",
        message: `Высокий спрос на «${intent.category}», мало качественных предложений (${activeInCategory} активных)`,
        metric: count,
        source: "buyer_demand_vs_supply",
      });
    }
  }

  if (conversion.lowQuality.length >= 20) {
    pushSignal(signals, {
      type: "REVENUE_OPPORTUNITY",
      category: null,
      severity: conversion.lowQuality.length >= 100 ? "HIGH" : "MEDIUM",
      message: `${conversion.lowQuality.length} товаров с низким качеством карточки`,
      metric: conversion.lowQuality.length,
      source: "product_quality.completeness",
    });
  }

  if (zeroSaleViews.length >= 10) {
    pushSignal(signals, {
      type: "REVENUE_OPPORTUNITY",
      category: null,
      severity: zeroSaleViews.length >= 100 ? "HIGH" : "MEDIUM",
      message: `${zeroSaleViews.length} товаров имеют просмотры, но 0 продаж`,
      metric: zeroSaleViews.length,
      source: "conversion.views_no_sales",
    });
  }

  if (conversion.addToCartRate != null && conversion.addToCartRate < 5) {
    pushSignal(signals, {
      type: "REVENUE_OPPORTUNITY",
      category: null,
      severity: "HIGH",
      message: `Низкая конверсия в корзину (${conversion.addToCartRate}%) — теряется выручка`,
      metric: conversion.addToCartRate,
      source: "analytics.funnel",
    });
  }

  return signals;
}

/** Top buyer demand queries for catalog/buyer surfaces. */
export async function collectBuyerDemandQueries(limit = 5): Promise<string[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const searches = await prisma.analyticsEvent.findMany({
    where: {
      event: ANALYTICS_EVENTS.SEARCH_USED,
      createdAt: { gte: since },
    },
    select: { entityId: true },
    take: 2000,
  });

  const counts = new Map<string, number>();
  for (const row of searches) {
    const q = row.entityId?.trim();
    if (!q || q.length < 3) continue;
    counts.set(q, (counts.get(q) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([q]) => q);
}
