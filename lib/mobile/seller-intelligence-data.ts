import { OrderStatus, ProductStatus } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { toPriceNumber } from "@/features/products/mappers";
import { LOW_STOCK_THRESHOLD } from "@/features/orders/lib/inventory-sync";
import {
  getSellerDashboardStats,
  getSellerOrderCounters,
  getSellerSettings,
  listSellerOrders,
} from "@/features/seller/queries";
import { prisma } from "@/lib/prisma";

import { buildSellerWorkspace } from "./seller-workspace-data";
import { isLotWalletEnabled, getWalletOverview } from "@/lib/lot-wallet";
import type {
  MobileSellerIntelligencePayload,
  SellerInsight,
  SellerIntelligenceSection,
  SellerIntelligenceSectionId,
  SellerRevenueTrendPoint,
} from "./seller-intelligence-types";
import {
  SELLER_INTELLIGENCE_SECTION_TITLES,
  buildMobileSellerIntelligencePayload,
} from "./seller-intelligence-types";

const COMPLETED_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
];

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDaysLeft(days: number): string {
  if (days <= 1) return "менее 1 дня";
  return `${Math.floor(days)} дн.`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

type ProductSalesWindow = {
  productId: string;
  name: string;
  quantity: number;
};

async function loadProductSalesWindows(
  sellerProfileId: string,
  now: Date,
): Promise<{ recent: ProductSalesWindow[]; prior: ProductSalesWindow[] }> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_DAY);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * MS_DAY);

  const items = await prisma.orderItem.findMany({
    where: {
      product: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      order: {
        status: { in: COMPLETED_STATUSES },
        createdAt: { gte: fourteenDaysAgo },
      },
    },
    select: {
      productId: true,
      quantity: true,
      order: { select: { createdAt: true } },
      product: { select: { name: true } },
    },
  });

  const recentMap = new Map<string, ProductSalesWindow>();
  const priorMap = new Map<string, ProductSalesWindow>();

  for (const item of items) {
    const createdAt = item.order.createdAt.getTime();
    const target = createdAt >= sevenDaysAgo.getTime() ? recentMap : priorMap;
    const existing = target.get(item.productId) ?? {
      productId: item.productId,
      name: item.product.name,
      quantity: 0,
    };
    existing.quantity += item.quantity;
    target.set(item.productId, existing);
  }

  return {
    recent: [...recentMap.values()].sort((a, b) => b.quantity - a.quantity),
    prior: [...priorMap.values()].sort((a, b) => b.quantity - a.quantity),
  };
}

async function computeDailyRevenueTrend(
  sellerProfileId: string,
  days: number,
  now: Date,
): Promise<SellerRevenueTrendPoint[]> {
  const start = startOfDay(new Date(now.getTime() - (days - 1) * MS_DAY));

  const items = await prisma.orderItem.findMany({
    where: {
      product: { sellerId: sellerProfileId },
      order: {
        status: { in: COMPLETED_STATUSES },
        createdAt: { gte: start },
      },
    },
    select: {
      totalPrice: true,
      order: { select: { id: true, createdAt: true } },
    },
  });

  const buckets = new Map<string, { revenue: number; orderIds: Set<string> }>();
  for (let i = 0; i < days; i += 1) {
    const day = startOfDay(new Date(start.getTime() + i * MS_DAY));
    buckets.set(day.toISOString().slice(0, 10), { revenue: 0, orderIds: new Set() });
  }

  for (const item of items) {
    const key = startOfDay(item.order.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += toPriceNumber(item.totalPrice);
    bucket.orderIds.add(item.order.id);
  }

  return [...buckets.entries()].map(([date, bucket]) => ({
    date,
    revenue: round2(bucket.revenue),
    orders: bucket.orderIds.size,
  }));
}

async function computeTopProducts(
  sellerProfileId: string,
  now: Date,
  limit = 5,
): Promise<Array<{ productId: string; name: string; quantity: number; revenue: number }>> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_DAY);

  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      product: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      order: {
        status: { in: COMPLETED_STATUSES },
        createdAt: { gte: thirtyDaysAgo },
      },
    },
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  return grouped
    .filter((g) => (g._sum.quantity ?? 0) > 0)
    .map((g) => ({
      productId: g.productId,
      name: nameById.get(g.productId) ?? "Товар",
      quantity: g._sum.quantity ?? 0,
      revenue: round2(toPriceNumber(g._sum.totalPrice ?? 0)),
    }));
}

async function computeSlowProducts(
  sellerProfileId: string,
  now: Date,
  limit = 5,
): Promise<Array<{ productId: string; name: string; views: number; daysListed: number }>> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_DAY);

  const products = await prisma.product.findMany({
    where: {
      sellerId: sellerProfileId,
      status: ProductStatus.ACTIVE,
      createdAt: { lte: thirtyDaysAgo },
    },
    select: {
      id: true,
      name: true,
      views: true,
      createdAt: true,
      _count: {
        select: {
          orderItems: {
            where: {
              order: {
                status: { in: COMPLETED_STATUSES },
                createdAt: { gte: thirtyDaysAgo },
              },
            },
          },
        },
      },
    },
    orderBy: { views: "asc" },
    take: 40,
  });

  return products
    .filter((p) => p._count.orderItems === 0)
    .slice(0, limit)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      views: p.views,
      daysListed: Math.floor((now.getTime() - p.createdAt.getTime()) / MS_DAY),
    }));
}

async function computeLowStockForecasts(
  sellerProfileId: string,
  recentSales: ProductSalesWindow[],
  limit = 5,
): Promise<
  Array<{
    productId: string;
    name: string;
    stock: number;
    dailySales: number;
    daysLeft: number | null;
  }>
> {
  const lowStockRows = await prisma.productInventory.findMany({
    where: {
      quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD },
      product: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
    },
    select: {
      quantity: true,
      product: { select: { id: true, name: true } },
    },
    take: 20,
  });

  const salesByProduct = new Map(recentSales.map((s) => [s.productId, s.quantity]));

  const forecasts = lowStockRows
    .map((row) => {
      const sold7d = salesByProduct.get(row.product.id) ?? 0;
      const dailySales = sold7d / 7;
      const daysLeft = dailySales > 0 ? row.quantity / dailySales : null;
      return {
        productId: row.product.id,
        name: row.product.name,
        stock: row.quantity,
        dailySales: round2(dailySales),
        daysLeft,
      };
    })
    .filter((row) => row.stock > 0)
    .sort((a, b) => {
      if (a.daysLeft === null && b.daysLeft === null) return a.stock - b.stock;
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    })
    .slice(0, limit);

  return forecasts;
}

function pushSection(
  sections: SellerIntelligenceSection[],
  id: SellerIntelligenceSectionId,
  insights: SellerInsight[],
): void {
  if (insights.length === 0) return;
  sections.push({
    id,
    title: SELLER_INTELLIGENCE_SECTION_TITLES[id],
    insights,
  });
}

export async function buildMobileSellerIntelligenceForUser(
  userId: string,
  sellerProfileId: string | null,
): Promise<MobileSellerIntelligencePayload> {
  if (!sellerProfileId) {
    return buildMobileSellerIntelligencePayload();
  }

  const now = new Date();
  const dayStart = startOfDay(now);

  const [
    orderCounters,
    dashboardStats,
    recentOrdersResult,
    settings,
    wallet,
    salesWindows,
    revenueTrendRaw,
    topProducts,
    slowProducts,
    draftCount,
    outOfStockCount,
  ] = await Promise.all([
    getSellerOrderCounters(sellerProfileId),
    getSellerDashboardStats(sellerProfileId),
    listSellerOrders(sellerProfileId, { page: 1, pageSize: 12 }),
    getSellerSettings(sellerProfileId).catch(() => null),
    isLotWalletEnabled()
      ? getWalletOverview({ userId, sellerProfileId }).catch(() => null)
      : Promise.resolve(null),
    loadProductSalesWindows(sellerProfileId, now),
    computeDailyRevenueTrend(sellerProfileId, 7, now),
    computeTopProducts(sellerProfileId, now),
    computeSlowProducts(sellerProfileId, now),
    prisma.product.count({
      where: { sellerId: sellerProfileId, status: ProductStatus.DRAFT },
    }),
    prisma.product.count({
      where: {
        sellerId: sellerProfileId,
        OR: [
          { status: ProductStatus.OUT_OF_STOCK },
          { status: ProductStatus.ACTIVE, stock: { lte: 0 } },
        ],
      },
    }),
  ]);

  const lowStockForecasts = await computeLowStockForecasts(
    sellerProfileId,
    salesWindows.recent,
  );

  const productBuckets = {
    drafts: draftCount,
    lowStock: dashboardStats.lowStockCount > 0 ? dashboardStats.lowStockCount : null,
    outOfStock: outOfStockCount,
  };

  const workspace = await buildSellerWorkspace({
    userId,
    sellerProfileId,
    recentOrders: recentOrdersResult.items,
    orderCounters,
    wallet: wallet
      ? { spendableAmount: wallet.buckets.spendableAmount, pendingFromSales: wallet.buckets.pendingFromSales }
      : null,
    productBuckets,
    sellerSettings: settings
      ? {
          storeName: settings.storeName,
          phone: settings.phone,
          description: settings.description,
        }
      : null,
    now,
  });

  const sections: SellerIntelligenceSection[] = [];

  const riskInsights: SellerInsight[] = [];
  if (orderCounters.overdue > 0) {
    riskInsights.push({
      id: "risk-overdue-orders",
      title: "Просроченные заказы",
      evidence: [{ label: "Просрочено", value: `${orderCounters.overdue} заказ(ов)` }],
      reason: "Заказы превысили срок обработки",
      recommendedAction: "Обработайте просроченные заказы",
      cta: {
        label: "К заказам",
        actionKind: null,
        actionPayload: null,
        route: "orders",
        entityId: null,
      },
    });
  }
  if (productBuckets.outOfStock > 0) {
    riskInsights.push({
      id: "risk-out-of-stock",
      title: "Товары без остатка",
      evidence: [{ label: "Без остатка", value: `${productBuckets.outOfStock} товар(ов)` }],
      reason: "Активные товары недоступны для покупки",
      recommendedAction: "Обновите остатки",
      cta: {
        label: "К товарам",
        actionKind: null,
        actionPayload: null,
        route: "products",
        entityId: null,
      },
    });
  }
  if (productBuckets.lowStock !== null && productBuckets.lowStock > 0) {
    riskInsights.push({
      id: "risk-low-stock-count",
      title: "Низкий остаток",
      evidence: [{ label: "Товаров", value: `${productBuckets.lowStock}` }],
      reason: "Остаток ниже порога пополнения",
      recommendedAction: "Пополните склад",
      cta: {
        label: "К товарам",
        actionKind: null,
        actionPayload: null,
        route: "products",
        entityId: null,
      },
    });
  }
  pushSection(sections, "todays_risks", riskInsights);

  const opportunityInsights: SellerInsight[] = [];
  const todayRevenue = revenueTrendRaw.at(-1)?.revenue ?? 0;
  const weekRevenue = revenueTrendRaw.reduce((sum, point) => sum + point.revenue, 0);
  const weekDailyAvg = revenueTrendRaw.length > 0 ? weekRevenue / revenueTrendRaw.length : 0;
  if (todayRevenue > 0 && weekDailyAvg > 0 && todayRevenue >= weekDailyAvg * 1.2) {
    opportunityInsights.push({
      id: "opp-revenue-spike",
      title: "Выручка выше среднего",
      evidence: [
        { label: "Сегодня", value: `${round2(todayRevenue)} ₽` },
        { label: "Среднее за 7 дн.", value: `${round2(weekDailyAvg)} ₽` },
      ],
      reason: "Сегодняшняя выручка превышает среднюю за неделю",
      recommendedAction: "Проверьте наличие популярных товаров",
      cta: {
        label: "К товарам",
        actionKind: null,
        actionPayload: null,
        route: "products",
        entityId: null,
      },
    });
  }
  if (orderCounters.newCount > 0) {
    opportunityInsights.push({
      id: "opp-new-orders",
      title: "Новые заказы",
      evidence: [{ label: "Новых", value: `${orderCounters.newCount}` }],
      reason: "Есть необработанные заказы",
      recommendedAction: "Подтвердите и обработайте заказы",
      cta: {
        label: "К заказам",
        actionKind: "confirm_order",
        actionPayload: null,
        route: "orders",
        entityId: null,
      },
    });
  }
  pushSection(sections, "todays_opportunities", opportunityInsights);

  const priorById = new Map(salesWindows.prior.map((p) => [p.productId, p.quantity]));
  const losingInsights: SellerInsight[] = [];
  for (const recent of salesWindows.recent) {
    const priorQty = priorById.get(recent.productId) ?? 0;
    if (priorQty >= 2 && recent.quantity < priorQty) {
      const delta = priorQty - recent.quantity;
      losingInsights.push({
        id: `losing-${recent.productId}`,
        title: recent.name,
        evidence: [
          { label: "7 дней", value: `${recent.quantity} шт.` },
          { label: "Пред. 7 дней", value: `${priorQty} шт.` },
          { label: "Снижение", value: `${delta} шт.` },
        ],
        reason: "Продажи снизились относительно предыдущей недели",
        recommendedAction: "Проверьте цену, фото и остаток",
        cta: {
          label: "Открыть товар",
          actionKind: null,
          actionPayload: null,
          route: "products",
          entityId: recent.productId,
        },
      });
    }
  }
  pushSection(sections, "products_losing_sales", losingInsights.slice(0, 5));

  const recentById = new Map(salesWindows.recent.map((r) => [r.productId, r.quantity]));
  const gainingInsights: SellerInsight[] = [];
  for (const prior of salesWindows.prior) {
    const recentQty = recentById.get(prior.productId) ?? 0;
    if (recentQty > prior.quantity && recentQty >= 2) {
      const delta = recentQty - prior.quantity;
      gainingInsights.push({
        id: `gaining-${prior.productId}`,
        title: prior.name,
        evidence: [
          { label: "7 дней", value: `${recentQty} шт.` },
          { label: "Пред. 7 дней", value: `${prior.quantity} шт.` },
          { label: "Рост", value: `+${delta} шт.` },
        ],
        reason: "Продажи выросли относительно предыдущей недели",
        recommendedAction: "Убедитесь в достаточном остатке",
        cta: {
          label: "Обновить остаток",
          actionKind: "update_stock",
          actionPayload: { productId: prior.productId, productName: prior.name },
          route: "products",
          entityId: prior.productId,
        },
      });
    }
  }
  for (const recent of salesWindows.recent) {
    if (gainingInsights.some((i) => i.id === `gaining-${recent.productId}`)) continue;
    if (!priorById.has(recent.productId) && recent.quantity >= 2) {
      gainingInsights.push({
        id: `gaining-new-${recent.productId}`,
        title: recent.name,
        evidence: [{ label: "7 дней", value: `${recent.quantity} шт.` }],
        reason: "Новые продажи за последние 7 дней",
        recommendedAction: "Поддерживайте остаток",
        cta: {
          label: "Обновить остаток",
          actionKind: "update_stock",
          actionPayload: { productId: recent.productId, productName: recent.name },
          route: "products",
          entityId: recent.productId,
        },
      });
    }
  }
  pushSection(sections, "products_gaining_sales", gainingInsights.slice(0, 5));

  const forecastInsights: SellerInsight[] = lowStockForecasts.map((row) => ({
    id: `forecast-${row.productId}`,
    title: row.name,
    evidence: [
      { label: "Остаток", value: `${row.stock} шт.` },
      { label: "Средние продажи", value: `${row.dailySales} шт./день` },
      ...(row.daysLeft !== null
        ? [{ label: "Хватит на", value: formatDaysLeft(row.daysLeft) }]
        : [{ label: "Продажи", value: "нет за 7 дней" }]),
    ],
    reason:
      row.daysLeft !== null
        ? "При текущем темпе продаж остаток скоро закончится"
        : "Низкий остаток без недавних продаж",
    recommendedAction: "Пополните остаток",
    cta: {
      label: "Пополнить",
      actionKind: "update_stock",
      actionPayload: { productId: row.productId, productName: row.name, currentStock: row.stock },
      route: "products",
      entityId: row.productId,
    },
  }));
  pushSection(sections, "low_stock_forecast", forecastInsights);

  const trendInsights: SellerInsight[] = [];
  const trendWithRevenue = revenueTrendRaw.filter((p) => p.revenue > 0);
  if (trendWithRevenue.length >= 2) {
    const first = trendWithRevenue[0];
    const last = trendWithRevenue[trendWithRevenue.length - 1];
    const delta = round2(last.revenue - first.revenue);
    trendInsights.push({
      id: "revenue-trend-summary",
      title: "Выручка за 7 дней",
      evidence: [
        { label: first.date, value: `${first.revenue} ₽` },
        { label: last.date, value: `${last.revenue} ₽` },
        { label: "Изменение", value: `${delta >= 0 ? "+" : ""}${delta} ₽` },
      ],
      reason: delta >= 0 ? "Выручка растёт за период" : "Выручка снижается за период",
      recommendedAction: delta >= 0 ? "Поддерживайте наличие топ-товаров" : "Проверьте заказы и остатки",
      cta: {
        label: "К заказам",
        actionKind: null,
        actionPayload: null,
        route: "orders",
        entityId: null,
      },
    });
  }
  pushSection(sections, "revenue_trend", trendInsights);

  const topInsights: SellerInsight[] = topProducts.map((product, index) => ({
    id: `top-${product.productId}`,
    title: product.name,
    evidence: [
      { label: "Продано за 30 дн.", value: `${product.quantity} шт.` },
      { label: "Выручка", value: `${product.revenue} ₽` },
      { label: "Место", value: `#${index + 1}` },
    ],
    reason: "Товар в топе продаж за последние 30 дней",
    recommendedAction: "Следите за остатком",
    cta: {
      label: "Открыть товар",
      actionKind: null,
      actionPayload: null,
      route: "products",
      entityId: product.productId,
    },
  }));
  pushSection(sections, "top_products", topInsights);

  const slowInsights: SellerInsight[] = slowProducts.map((product) => ({
    id: `slow-${product.productId}`,
    title: product.name,
    evidence: [
      { label: "Продаж за 30 дн.", value: "0" },
      { label: "Просмотры", value: `${product.views}` },
      { label: "В каталоге", value: `${product.daysListed} дн.` },
    ],
    reason: "Нет продаж за последние 30 дней",
    recommendedAction: "Обновите карточку или скройте товар",
    cta: {
      label: "Открыть товар",
      actionKind: null,
      actionPayload: null,
      route: "products",
      entityId: product.productId,
    },
  }));
  pushSection(sections, "slow_products", slowInsights);

  const pendingItems = workspace.items.filter(
    (item) => item.priority !== "completed" && !item.completedAt,
  );
  const pendingInsights: SellerInsight[] = pendingItems.slice(0, 8).map((item) => ({
    id: `pending-${item.id}`,
    title: item.title,
    evidence: [
      ...(item.subtitle ? [{ label: "Детали", value: item.subtitle }] : []),
      { label: "Приоритет", value: item.priority },
    ],
    reason: "Задача из рабочего центра требует действия",
    recommendedAction: item.subtitle ?? item.title,
    cta: {
      label: item.actionKind ? "Выполнить" : "Открыть",
      actionKind: item.actionKind,
      actionPayload: item.actionPayload,
      route: item.action,
      entityId: item.entityId,
    },
  }));
  pushSection(sections, "pending_actions", pendingInsights);

  const completedItems = workspace.items.filter(
    (item) => item.priority === "completed" || item.completedAt !== null || item.section === "completed_today",
  );
  const completedTodayCount = await prisma.order.count({
    where: {
      status: { in: COMPLETED_STATUSES },
      updatedAt: { gte: dayStart },
      items: { some: { product: { sellerId: sellerProfileId } } },
    },
  });
  const completedInsights: SellerInsight[] = completedItems.slice(0, 8).map((item) => ({
    id: `completed-${item.id}`,
    title: item.title,
    evidence: [
      ...(item.completedAt ? [{ label: "Завершено", value: item.completedAt }] : []),
      ...(item.subtitle ? [{ label: "Детали", value: item.subtitle }] : []),
    ],
    reason: "Действие выполнено сегодня",
    recommendedAction: "—",
    cta: {
      label: "Подробнее",
      actionKind: null,
      actionPayload: null,
      route: item.action,
      entityId: item.entityId,
    },
  }));
  if (completedInsights.length === 0 && completedTodayCount > 0) {
    completedInsights.push({
      id: "completed-orders-today",
      title: "Завершённые заказы сегодня",
      evidence: [{ label: "Заказов", value: `${completedTodayCount}` }],
      reason: "Заказы завершены сегодня",
      recommendedAction: "—",
      cta: {
        label: "К заказам",
        actionKind: null,
        actionPayload: null,
        route: "orders",
        entityId: null,
      },
    });
  }
  pushSection(sections, "completed_actions", completedInsights);

  const revenueTrend =
    revenueTrendRaw.some((point) => point.revenue > 0 || point.orders > 0) ? revenueTrendRaw : null;

  return buildMobileSellerIntelligencePayload({
    generatedAt: now.toISOString(),
    sections,
    revenueTrend,
  });
}

export async function buildMobileSellerIntelligenceFromRequest(
  request: Request,
): Promise<MobileSellerIntelligencePayload> {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role)) {
    return buildMobileSellerIntelligencePayload();
  }
  return buildMobileSellerIntelligenceForUser(user.id, user.sellerProfileId);
}
