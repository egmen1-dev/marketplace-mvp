import { ProductStatus } from "@prisma/client";

import { getAdminDashboardStats } from "@/features/admin/queries";
import { getConversionDashboard } from "@/lib/conversion/queries";
import { prisma } from "@/lib/prisma";
import { getSellerGrowthDashboard } from "@/lib/seller-growth/queries";
import { isSellerGrowthEnabled } from "@/lib/seller-growth/flags";

import { isMarketplaceIntelligenceEnabled } from "./flags";
import {
  buildMarketplaceHealth,
  buildMarketplaceProblems,
  buildRevenueOpportunities,
} from "./insights";
import { detectMarketplaceOpportunities } from "./opportunities";
import { generateMarketplaceRecommendations } from "./recommendations";
import {
  collectBuyerDemandQueries,
  collectMarketplaceSignals,
} from "./signals";
import type {
  BuyerDemandInsight,
  MarketplaceIntelligenceDashboard,
  SellerMarketplaceConnection,
} from "./types";

export class MarketplaceIntelligenceForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "Marketplace intelligence недоступен") {
    super(message);
    this.name = "MarketplaceIntelligenceForbiddenError";
  }
}

/** Admin-only gate for marketplace brain surfaces. */
export function assertMarketplaceIntelligenceAccess(role: string | undefined): void {
  if (role !== "ADMIN") {
    throw new MarketplaceIntelligenceForbiddenError();
  }
}

export async function getMarketplaceIntelligenceDashboard(): Promise<MarketplaceIntelligenceDashboard> {
  const enabled = isMarketplaceIntelligenceEnabled();

  if (!enabled) {
    return {
      enabled: false,
      health: {
        gmv: 0,
        sellers: 0,
        buyers: 0,
        conversionRate: null,
        activeProducts: 0,
        orders: 0,
      },
      signals: [],
      opportunities: [],
      problems: [],
      recommendations: [],
      revenueOpportunities: [],
      buyerDemand: null,
    };
  }

  const [stats, conversion, signals, demandQueries] = await Promise.all([
    getAdminDashboardStats(),
    getConversionDashboard(30),
    collectMarketplaceSignals(),
    collectBuyerDemandQueries(6),
  ]);

  const opportunities = detectMarketplaceOpportunities(signals);
  const revenueOpportunities = buildRevenueOpportunities(signals);
  const recommendations = generateMarketplaceRecommendations({
    signals,
    opportunities,
    revenueOpportunities,
  });
  const problems = buildMarketplaceProblems(signals);

  const health = buildMarketplaceHealth({
    gmv: stats.revenue,
    sellers: stats.sellersCount,
    buyers: stats.usersCount,
    activeProducts: stats.activeProductsCount,
    orders: stats.ordersCount,
    conversionRate: conversion.addToCartRate,
  });

  const buyerDemand: BuyerDemandInsight | null =
    demandQueries.length > 0
      ? {
          headline: "Покупатели ищут:",
          queries: demandQueries,
        }
      : null;

  return {
    enabled: true,
    health,
    signals,
    opportunities,
    problems,
    recommendations,
    revenueOpportunities,
    buyerDemand,
  };
}

/** Connect marketplace trends to an individual seller (advisory). */
export async function getSellerMarketplaceConnection(
  sellerProfileId: string,
): Promise<SellerMarketplaceConnection | null> {
  if (!isMarketplaceIntelligenceEnabled()) return null;

  const [signals, demandQueries, sellerProducts, growth] = await Promise.all([
    collectMarketplaceSignals(),
    collectBuyerDemandQueries(5),
    prisma.product.findMany({
      where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        stock: true,
        category: { select: { name: true } },
      },
      take: 40,
    }),
    isSellerGrowthEnabled()
      ? getSellerGrowthDashboard(sellerProfileId)
      : Promise.resolve(null),
  ]);

  const sellerCategories = new Set(
    sellerProducts
      .map((p) => p.category?.name)
      .filter((c): c is string => Boolean(c)),
  );

  const growing = signals.filter(
    (s) =>
      s.type === "CATEGORY_TREND" &&
      s.category &&
      sellerCategories.has(s.category),
  );

  const insights: SellerMarketplaceConnection["insights"] = [];

  for (const trend of growing.slice(0, 2)) {
    const lowStock = sellerProducts.filter(
      (p) =>
        p.category?.name === trend.category &&
        p.stock > 0 &&
        p.stock <= 3,
    );
    insights.push({
      headline: `Категория «${trend.category}» растёт на площадке`,
      reasons: [
        trend.message,
        "Ваш товар подходит этому спросу",
        lowStock.length > 0 ? "Рекомендуем добавить остаток" : "Поддерживайте наличие",
      ],
      recommendedAction:
        lowStock.length > 0
          ? "Пополните склад по растущей категории"
          : "Усильте карточки в растущей категории",
      href: "/account/products",
    });
  }

  if (growth?.nextAction) {
    insights.push({
      headline: "Рекомендация AI Marketplace Brain",
      reasons: [growth.nextAction.impact, growth.nextAction.action],
      recommendedAction: growth.nextAction.action,
      href: growth.nextAction.href,
    });
  }

  const demandHeadline =
    demandQueries.length > 0
      ? `Покупатели ищут: ${demandQueries.slice(0, 3).join(", ")}`
      : null;

  if (insights.length === 0 && demandHeadline) {
    insights.push({
      headline: "Спрос на площадке",
      reasons: [demandHeadline],
      recommendedAction: "Добавьте товары под популярные запросы",
      href: "/account/products/new",
    });
  }

  return { insights: insights.slice(0, 3), demandHeadline };
}

export async function getBuyerDemandInsight(): Promise<BuyerDemandInsight | null> {
  if (!isMarketplaceIntelligenceEnabled()) return null;
  const queries = await collectBuyerDemandQueries(5);
  if (queries.length === 0) return null;
  return { headline: "Покупатели ищут:", queries };
}

export { isMarketplaceIntelligenceEnabled } from "./flags";
