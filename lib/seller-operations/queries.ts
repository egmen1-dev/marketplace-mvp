import { ProductStatus } from "@prisma/client";

import {
  getSellerDashboardStats,
  getSellerOrderCounters,
} from "@/features/seller/queries";
import { getSellerBalance } from "@/lib/finance";
import { loadSellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import { getSellerJourneyDashboard } from "@/lib/seller-journey/queries";
import { isSellerJourneyEnabled } from "@/lib/seller-journey/flags";
import { prisma } from "@/lib/prisma";

import {
  buildOperationsNotifications,
  buildResultSummary,
  buildTodaySummary,
} from "./alerts";
import { isSellerOperationsEnabled } from "./flags";
import { loadInventoryInsights } from "./inventory";
import { buildOrderOperations } from "./orders";
import {
  buildOperationsEmptyState,
  loadProductAttentionItems,
} from "./products";
import { getSellerDailyPriorities } from "./priorities";
import {
  buildAiDailyAdvice,
  buildMoneyOperations,
  buildPromotionToday,
} from "./recommendations";
import type {
  AdminOperationsHealth,
  DevelopmentChecklistItem,
  SellerOperationsNotification,
  SellerOperationsWorkspace,
} from "./types";

const disabledWorkspace: SellerOperationsWorkspace = {
  enabled: false,
  mode: "today",
  todaySummary: [],
  priorities: [],
  orders: {
    newOrders: 0,
    shipToday: 0,
    overdue: 0,
    inProgress: 0,
    awaitingShipment: 0,
    ctaHref: "/account/sales",
  },
  products: [],
  inventory: [],
  aiAdvice: {
    headline: "",
    opportunity: "",
    action: "",
    why: "",
    ctaLabel: "",
    ctaHref: "/account",
  },
  promotion: {
    activeCampaigns: 0,
    bestCampaign: null,
    weakCampaign: null,
    ctaHref: "/account/promotion-center",
  },
  money: {
    salesTotal: 0,
    pendingAmount: 0,
    availableAmount: 0,
    paidAmount: 0,
    ctaLabel: "",
    ctaHref: "/account/balance",
  },
  checklist: [],
  emptyState: null,
  resultSummary: "",
};

function buildChecklist(input: {
  signals: Awaited<ReturnType<typeof loadSellerProgressSignals>>;
  journeyChecklist?: DevelopmentChecklistItem[];
}): DevelopmentChecklistItem[] {
  if (input.journeyChecklist && input.journeyChecklist.length > 0) {
    return [
      ...input.journeyChecklist,
      {
        id: "growth",
        label: "Рост продаж",
        done:
          input.signals.ordersCount >= 3 ||
          input.signals.completedPayouts > 0,
      },
    ];
  }

  const { signals } = input;
  return [
    { id: "product", label: "Создан товар", done: signals.totalProducts > 0 },
    {
      id: "card",
      label: "Заполнена карточка",
      done: signals.bestCompletenessScore >= 70,
    },
    { id: "views", label: "Получены просмотры", done: signals.viewsSum > 0 },
    { id: "order", label: "Первый заказ", done: signals.ordersCount > 0 },
    {
      id: "payout",
      label: "Первая выплата",
      done: signals.completedPayouts > 0 || signals.paidAmount > 0,
    },
    {
      id: "growth",
      label: "Рост продаж",
      done: signals.ordersCount >= 3,
    },
  ];
}

export async function getSellerOperationsWorkspace(
  sellerProfileId: string,
): Promise<SellerOperationsWorkspace> {
  if (!isSellerOperationsEnabled()) return disabledWorkspace;

  const [stats, orderCounters, signals, balance, products, inventory, journey] =
    await Promise.all([
      getSellerDashboardStats(sellerProfileId),
      getSellerOrderCounters(sellerProfileId),
      loadSellerProgressSignals(sellerProfileId),
      getSellerBalance(sellerProfileId),
      loadProductAttentionItems(sellerProfileId),
      loadInventoryInsights(sellerProfileId),
      isSellerJourneyEnabled()
        ? getSellerJourneyDashboard(sellerProfileId)
        : Promise.resolve(null),
    ]);

  const topProduct = await prisma.product.findFirst({
    where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
    orderBy: { views: "desc" },
    select: { name: true },
  });

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
  const todaySummary = buildTodaySummary({
    orders,
    productAttentionCount: products.length,
    aiAdvice,
    availableBalance: balance.availableAmount,
    revenue: stats.revenue,
  });
  const money = buildMoneyOperations({
    revenue: stats.revenue,
    pendingAmount: balance.pendingAmount,
    availableAmount: balance.availableAmount,
    paidAmount: balance.paidAmount,
  });
  const promotion = buildPromotionToday({
    signals,
    topProductName: topProduct?.name,
  });
  const journeyChecklist =
    journey?.enabled
      ? journey.checklist.map((item) => ({
          id: item.id,
          label: item.label,
          done: item.done,
        }))
      : undefined;
  const checklist = buildChecklist({ signals, journeyChecklist });
  const emptyState = buildOperationsEmptyState({
    activeProducts: stats.activeProducts,
    totalProducts: stats.totalProducts,
    ordersCount: stats.ordersCount,
  });

  return {
    enabled: true,
    mode: "today",
    todaySummary,
    priorities,
    orders,
    products,
    inventory,
    aiAdvice,
    promotion,
    money,
    checklist,
    emptyState,
    resultSummary: buildResultSummary({
      ordersProcessedHint: 0,
      issuesRemaining: priorities.length,
      availableBalance: balance.availableAmount,
    }),
  };
}

export async function getSellerOperationsNotifications(input: {
  sellerProfileId: string;
}): Promise<SellerOperationsNotification[]> {
  if (!isSellerOperationsEnabled()) return [];
  const workspace = await getSellerOperationsWorkspace(input.sellerProfileId);
  if (!workspace.enabled) return [];

  return buildOperationsNotifications({
    orders: workspace.orders,
    products: workspace.products,
    aiAdvice: workspace.aiAdvice,
    availableBalance: workspace.money.availableAmount,
  });
}

export async function getAdminSellerOperationsHealth(): Promise<AdminOperationsHealth> {
  if (!isSellerOperationsEnabled()) {
    return {
      enabled: false,
      sellersWithOpenTasks: 0,
      sellersWithOverdueOrders: 0,
      productsWithoutSales: 0,
      growthPotentialSellers: 0,
    };
  }

  const sellers = await prisma.sellerProfile.findMany({ select: { id: true } });
  const sellerIds = sellers.map((s) => s.id);
  if (sellerIds.length === 0) {
    return {
      enabled: true,
      sellersWithOpenTasks: 0,
      sellersWithOverdueOrders: 0,
      productsWithoutSales: 0,
      growthPotentialSellers: 0,
    };
  }

  const [overdueOrders, highViewNoOrderProducts, growthSellerGroups] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          isOverdue: true,
          items: { some: { product: { sellerId: { in: sellerIds } } } },
        },
        select: {
          items: { select: { product: { select: { sellerId: true } } } },
        },
      }),
      prisma.product.count({
        where: {
          sellerId: { in: sellerIds },
          status: ProductStatus.ACTIVE,
          views: { gte: 20 },
          orderItems: { none: {} },
        },
      }),
      prisma.product.groupBy({
        by: ["sellerId"],
        where: {
          sellerId: { in: sellerIds },
          status: ProductStatus.ACTIVE,
          views: { gt: 0 },
        },
      }),
    ]);

  const overdueSellerIds = new Set<string>();
  for (const order of overdueOrders) {
    for (const item of order.items) {
      overdueSellerIds.add(item.product.sellerId);
    }
  }

  let growthPotentialSellers = 0;
  for (const row of growthSellerGroups) {
    const orderCount = await prisma.orderItem.count({
      where: { product: { sellerId: row.sellerId } },
    });
    if (orderCount === 0) growthPotentialSellers += 1;
  }

  const sellersWithOverdueOrders = overdueSellerIds.size;
  const sellersWithOpenTasks = Math.min(
    sellerIds.length,
    sellersWithOverdueOrders + growthPotentialSellers,
  );

  return {
    enabled: true,
    sellersWithOpenTasks,
    sellersWithOverdueOrders,
    productsWithoutSales: highViewNoOrderProducts,
    growthPotentialSellers,
  };
}
