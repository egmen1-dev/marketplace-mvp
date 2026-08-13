import { OrderStatus, ProductStatus } from "@prisma/client";

import {
  getSellerOrderCounters,
} from "@/features/seller/queries";
import { getSellerBalance } from "@/lib/finance";
import { loadSellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import { prisma } from "@/lib/prisma";
import { isSellerJourneyEnabled } from "@/lib/seller-journey/flags";
import { getSellerJourneyDashboard } from "@/lib/seller-journey/queries";
import { buildOrderOperations } from "@/lib/seller-operations/orders";
import { loadProductAttentionItems } from "@/lib/seller-operations/products";
import { getSellerDailyPriorities } from "@/lib/seller-operations/priorities";
import { buildAiDailyAdvice } from "@/lib/seller-operations/recommendations";

import { buildSellerAssistant } from "./assistant";
import {
  buildGrowthDiagnosis,
  countPromotionReady,
  countWeakCards,
} from "./diagnosis";
import { buildSmartEmptyState } from "./empty-states";
import { isSellerBusinessIntelligenceEnabled } from "./flags";
import { buildNextBusinessAction } from "./next-action";
import { buildBusinessNotifications } from "./notifications";
import { buildFirstSellerJourney } from "./onboarding";
import { buildPromotionInsight } from "./promotion";
import { buildBusinessSummary, detectMainProblem } from "./summary";
import type {
  AdminSellerActivationIntelligence,
  BusinessPeriodMetrics,
  SellerBusinessDashboard,
  SellerBusinessNotification,
} from "./types";

const disabledDashboard: SellerBusinessDashboard = {
  enabled: false,
  summary: {
    headline: "",
    periodLines: [],
    mainProblem: null,
    nextStepHint: "",
  },
  nextAction: {
    id: "",
    title: "",
    why: "",
    benefit: "",
    ctaLabel: "",
    ctaHref: "/account",
  },
  problems: [],
  assistant: {
    headline: "",
    strengths: [],
    improvements: [],
    nextStep: "",
    nextStepWhy: "",
    ctaLabel: "",
    ctaHref: "/account",
  },
  firstJourney: [],
  promotion: {
    headline: "",
    bullets: [],
    recommendation: "",
    ctaLabel: "",
    ctaHref: "/account",
  },
  emptyState: null,
};

async function loadPeriodMetrics(
  sellerProfileId: string,
): Promise<BusinessPeriodMetrics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [viewsAgg, cartAdds7d, orders7d, ordersTotal] = await Promise.all([
    prisma.product.aggregate({
      where: { sellerId: sellerProfileId },
      _sum: { views: true },
    }),
    prisma.cartItem.count({
      where: {
        product: { sellerId: sellerProfileId },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.order.count({
      where: {
        items: { some: { product: { sellerId: sellerProfileId } } },
        status: { not: OrderStatus.CANCELLED },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.order.count({
      where: {
        items: { some: { product: { sellerId: sellerProfileId } } },
        status: { not: OrderStatus.CANCELLED },
      },
    }),
  ]);

  return {
    viewsTotal: viewsAgg._sum.views ?? 0,
    cartAdds7d,
    orders7d,
    ordersTotal,
  };
}

export async function getSellerBusinessDashboard(
  sellerProfileId: string,
): Promise<SellerBusinessDashboard> {
  if (!isSellerBusinessIntelligenceEnabled()) return disabledDashboard;

  const [signals, metrics, products, balance, orderCounters, journey, topProduct] =
    await Promise.all([
      loadSellerProgressSignals(sellerProfileId),
      loadPeriodMetrics(sellerProfileId),
      loadProductAttentionItems(sellerProfileId),
      getSellerBalance(sellerProfileId),
      getSellerOrderCounters(sellerProfileId),
      isSellerJourneyEnabled()
        ? getSellerJourneyDashboard(sellerProfileId)
        : Promise.resolve(null),
      prisma.product.findFirst({
        where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
        orderBy: { views: "desc" },
        select: { id: true, name: true },
      }),
    ]);

  const orders = buildOrderOperations(orderCounters);
  const aiAdvice = buildAiDailyAdvice({
    signals,
    topProductName: topProduct?.name,
  });
  const priorities = getSellerDailyPriorities({
    orders,
    products,
    availableBalance: balance.availableAmount,
    aiAction: {
      title: aiAdvice.action,
      why: aiAdvice.why,
      ctaLabel: aiAdvice.ctaLabel,
      ctaHref: aiAdvice.ctaHref,
    },
  });

  const mainProblem = detectMainProblem(signals);
  const nextAction = buildNextBusinessAction({
    signals,
    topPriority: priorities[0] ?? null,
    journeyCoach: journey?.enabled ? journey.coach : null,
    topProduct: topProduct ?? undefined,
  });

  const summary = buildBusinessSummary({
    signals,
    metrics,
    mainProblem,
    nextStepHint: nextAction.title,
  });

  const weakCardCount = countWeakCards(products);
  const lowStockCount = products.filter((p) => p.type === "low_stock").length;
  const promotionReadyCount = countPromotionReady({ signals, products });

  const problems = buildGrowthDiagnosis({
    signals,
    products,
    weakCardCount,
    lowStockCount,
    promotionReadyCount,
  });

  const assistant = buildSellerAssistant({
    signals,
    products,
    nextActionTitle: nextAction.title,
    nextActionHref: nextAction.ctaHref,
  });

  return {
    enabled: true,
    summary,
    nextAction,
    problems,
    assistant,
    firstJourney: buildFirstSellerJourney(signals),
    promotion: buildPromotionInsight({
      signals,
      topProductName: topProduct?.name,
    }),
    emptyState: buildSmartEmptyState({ signals }),
  };
}

export async function getSellerBusinessNotifications(input: {
  sellerProfileId: string;
}): Promise<SellerBusinessNotification[]> {
  if (!isSellerBusinessIntelligenceEnabled()) return [];

  const dashboard = await getSellerBusinessDashboard(input.sellerProfileId);
  if (!dashboard.enabled) return [];

  const signals = await loadSellerProgressSignals(input.sellerProfileId);
  return buildBusinessNotifications({
    signals,
    nextAction: dashboard.nextAction,
    problems: dashboard.problems,
  });
}

export async function getAdminSellerActivationIntelligence(): Promise<AdminSellerActivationIntelligence> {
  if (!isSellerBusinessIntelligenceEnabled()) {
    return {
      enabled: false,
      sellersWithoutProduct: 0,
      sellersWithoutSales: 0,
      sellersWithWeakCards: 0,
      sellersPromotionReady: 0,
      sellersAwaitingPayout: 0,
    };
  }

  const sellers = await prisma.sellerProfile.findMany({ select: { id: true } });
  const sellerIds = sellers.map((s) => s.id);

  if (sellerIds.length === 0) {
    return {
      enabled: true,
      sellersWithoutProduct: 0,
      sellersWithoutSales: 0,
      sellersWithWeakCards: 0,
      sellersPromotionReady: 0,
      sellersAwaitingPayout: 0,
    };
  }

  const [
    withoutProduct,
    withoutSales,
    weakCardProducts,
    withViews,
    awaitingPayout,
  ] = await Promise.all([
    prisma.sellerProfile.count({
      where: { products: { none: {} } },
    }),
    prisma.sellerProfile.count({
      where: {
        products: { some: { status: ProductStatus.ACTIVE } },
        NOT: {
          products: {
            some: { orderItems: { some: {} } },
          },
        },
      },
    }),
    prisma.product.count({
      where: {
        sellerId: { in: sellerIds },
        status: ProductStatus.ACTIVE,
        views: { gte: 5 },
        orderItems: { none: {} },
      },
    }),
    prisma.product.groupBy({
      by: ["sellerId"],
      where: {
        sellerId: { in: sellerIds },
        status: ProductStatus.ACTIVE,
        views: { gte: 20 },
      },
    }),
    prisma.sellerBalance.count({
      where: {
        sellerId: { in: sellerIds },
        availableAmount: { gt: 0 },
      },
    }),
  ]);

  return {
    enabled: true,
    sellersWithoutProduct: withoutProduct,
    sellersWithoutSales: withoutSales,
    sellersWithWeakCards: weakCardProducts,
    sellersPromotionReady: withViews.length,
    sellersAwaitingPayout: awaitingPayout,
  };
}
