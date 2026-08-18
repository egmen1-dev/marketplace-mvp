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
import { getWalletOverview, isLotWalletEnabled } from "@/lib/lot-wallet";
import { prisma } from "@/lib/prisma";

import {
  buildMobileSellerHomePayload,
  type MobileSellerHomeActivity,
  type MobileSellerHomeNotification,
  type MobileSellerHomePayload,
  type MobileSellerHomeTask,
} from "./seller-home";
import { buildSellerWorkspace } from "./seller-workspace-data";

const COMPLETED_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

async function computeRevenuePeriods(sellerProfileId: string, now = new Date()) {
  const monthStart = startOfMonth(now);
  const items = await prisma.orderItem.findMany({
    where: {
      product: { sellerId: sellerProfileId },
      order: {
        status: { in: COMPLETED_STATUSES },
        createdAt: { gte: monthStart },
      },
    },
    select: {
      totalPrice: true,
      order: { select: { id: true, createdAt: true } },
    },
  });

  const dayStart = startOfDay(now).getTime();
  const weekStart = startOfWeek(now).getTime();
  const monthStartMs = monthStart.getTime();

  let today = 0;
  let week = 0;
  let month = 0;
  const orderIdsToday = new Set<string>();
  const orderIdsWeek = new Set<string>();
  const orderIdsMonth = new Set<string>();

  for (const item of items) {
    const amount = toPriceNumber(item.totalPrice);
    const createdAt = item.order.createdAt.getTime();
    if (createdAt >= monthStartMs) {
      month += amount;
      orderIdsMonth.add(item.order.id);
    }
    if (createdAt >= weekStart) {
      week += amount;
      orderIdsWeek.add(item.order.id);
    }
    if (createdAt >= dayStart) {
      today += amount;
      orderIdsToday.add(item.order.id);
    }
  }

  const averageOrder =
    orderIdsMonth.size > 0 ? Math.round((month / orderIdsMonth.size) * 100) / 100 : null;

  return { today, week, month, averageOrder };
}

async function computeProductBuckets(sellerProfileId: string) {
  const [active, outOfStockActive, drafts, hidden, lowStock] = await Promise.all([
    prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE } }),
    prisma.product.count({
      where: {
        sellerId: sellerProfileId,
        status: ProductStatus.ACTIVE,
        stock: { lte: 0 },
      },
    }),
    prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.DRAFT } }),
    prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.ARCHIVED } }),
    prisma.productInventory.count({
      where: {
        product: { sellerId: sellerProfileId },
        quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD },
      },
    }),
  ]);

  const outOfStockStatus = await prisma.product.count({
    where: { sellerId: sellerProfileId, status: ProductStatus.OUT_OF_STOCK },
  });

  return {
    active,
    outOfStock: outOfStockActive + outOfStockStatus,
    drafts,
    hidden,
    lowStock: lowStock > 0 ? lowStock : null,
  };
}

async function computeInsights(sellerProfileId: string) {
  const [topProduct, categoryAgg] = await Promise.all([
    prisma.product.findFirst({
      where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      orderBy: { views: "desc" },
      select: { name: true, views: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        product: { sellerId: sellerProfileId },
        order: { status: { in: COMPLETED_STATUSES } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 1,
    }),
  ]);

  let bestSellingCategory: string | null = null;
  if (categoryAgg.length > 0) {
    const product = await prisma.product.findUnique({
      where: { id: categoryAgg[0].productId },
      select: { category: { select: { name: true } } },
    });
    bestSellingCategory = product?.category?.name ?? null;
  }

  return {
    bestSellingCategory,
    mostViewedProduct: topProduct && topProduct.views > 0 ? topProduct.name : null,
    returningCustomersPct: null as number | null,
  };
}

function buildTasks(input: {
  needAction: number;
  outOfStock: number;
  drafts: number;
  lowStock: number | null;
}): MobileSellerHomeTask[] {
  const tasks: MobileSellerHomeTask[] = [];
  if (input.needAction > 0) {
    tasks.push({
      id: "process-orders",
      title: `Обработать ${input.needAction} заказ(ов)`,
      action: "orders",
    });
  }
  if (input.outOfStock > 0) {
    tasks.push({
      id: "update-stock",
      title: `Обновить остатки у ${input.outOfStock} товар(ов)`,
      action: "products",
    });
  }
  if (input.drafts > 0) {
    tasks.push({
      id: "publish-drafts",
      title: `Опубликовать ${input.drafts} черновик(ов)`,
      action: "products",
    });
  }
  if (input.lowStock !== null && input.lowStock > 0) {
    tasks.push({
      id: "low-stock",
      title: `Пополнить ${input.lowStock} товар(ов) с низким остатком`,
      action: "products",
    });
  }
  return tasks;
}

const NEW_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.NEW,
  OrderStatus.PAID,
  OrderStatus.AWAITING_SELLER_CONFIRMATION,
]);

function buildNotifications(input: {
  recentOrders: Awaited<ReturnType<typeof listSellerOrders>>["items"];
  lowStock: number | null;
  overdue: number;
}): MobileSellerHomeNotification[] {
  const notifications: MobileSellerHomeNotification[] = [];
  for (const order of input.recentOrders.slice(0, 3)) {
    if (NEW_ORDER_STATUSES.has(order.status)) {
      notifications.push({
        id: `order-${order.id}`,
        kind: "new_order",
        title: "Новый заказ",
        body: `${order.orderNumber} · ${formatBuyer(order.buyerName)}`,
        createdAt: order.createdAt,
      });
    } else if (order.status === OrderStatus.CANCELLED) {
      notifications.push({
        id: `cancel-${order.id}`,
        kind: "order_cancelled",
        title: "Заказ отменён",
        body: order.orderNumber,
        createdAt: order.createdAt,
      });
    }
  }
  if (input.lowStock !== null && input.lowStock > 0) {
    notifications.push({
      id: "low-stock",
      kind: "low_stock",
      title: "Низкий остаток",
      body: `${input.lowStock} товар(ов) требуют пополнения`,
      createdAt: new Date().toISOString(),
    });
  }
  if (input.overdue > 0) {
    notifications.push({
      id: "overdue-orders",
      kind: "system",
      title: "Просроченные заказы",
      body: `${input.overdue} заказ(ов) требуют срочной обработки`,
      createdAt: new Date().toISOString(),
    });
  }
  return notifications.slice(0, 8);
}

function buildRecentActivity(
  recentOrders: Awaited<ReturnType<typeof listSellerOrders>>["items"],
): MobileSellerHomeActivity[] {
  return recentOrders.slice(0, 12).map((order) => ({
    id: order.id,
    kind: "order" as const,
    title: `Заказ ${order.orderNumber}`,
    subtitle: `${formatBuyer(order.buyerName)} · ${formatPrice(order.sellerSubtotal)}`,
    createdAt: order.createdAt,
  }));
}

function formatBuyer(name: string | null): string {
  return name?.trim() || "Покупатель";
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function buildMobileSellerHomeForUser(
  userId: string,
  sellerProfileId: string | null,
): Promise<MobileSellerHomePayload> {
  if (!sellerProfileId) {
    return buildMobileSellerHomePayload();
  }

  const now = new Date();
  const dayStart = startOfDay(now);

  const [
    settings,
    stats,
    orderCounters,
    productBuckets,
    revenue,
    completedCount,
    ordersToday,
    wallet,
    recentOrdersResult,
  ] = await Promise.all([
    getSellerSettings(sellerProfileId).catch(() => null),
    getSellerDashboardStats(sellerProfileId),
    getSellerOrderCounters(sellerProfileId),
    computeProductBuckets(sellerProfileId),
    computeRevenuePeriods(sellerProfileId, now),
    prisma.order.count({
      where: {
        status: { in: COMPLETED_STATUSES },
        items: { some: { product: { sellerId: sellerProfileId } } },
      },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: dayStart },
        items: { some: { product: { sellerId: sellerProfileId } } },
      },
    }),
    isLotWalletEnabled()
      ? getWalletOverview({ userId, sellerProfileId }).catch(() => null)
      : Promise.resolve(null),
    listSellerOrders(sellerProfileId, { page: 1, pageSize: 12 }),
  ]);

  const needAction = orderCounters.newCount + orderCounters.inProgress + orderCounters.awaitingShipment;
  const insights = await computeInsights(sellerProfileId);
  const tasks = buildTasks({
    needAction,
    outOfStock: productBuckets.outOfStock,
    drafts: productBuckets.drafts,
    lowStock: productBuckets.lowStock,
  });
  const notifications = buildNotifications({
    recentOrders: recentOrdersResult.items,
    lowStock: productBuckets.lowStock,
    overdue: orderCounters.overdue,
  });
  const recentActivity = buildRecentActivity(recentOrdersResult.items);

  const trustProfile = settings
    ? await prisma.sellerProfile.findUnique({
        where: { id: sellerProfileId },
        select: { isVerified: true },
      })
    : null;

  const revenueTodayAvailable = revenue.today > 0 || ordersToday > 0;

  const workspace = await buildSellerWorkspace({
    userId,
    sellerProfileId,
    recentOrders: recentOrdersResult.items,
    orderCounters,
    wallet: wallet
      ? { spendableAmount: wallet.buckets.spendableAmount, pendingFromSales: wallet.buckets.pendingFromSales }
      : null,
    productBuckets,
    now,
  });

  return buildMobileSellerHomePayload({
    header: settings
      ? {
          storeName: settings.storeName,
          logoUrl: settings.logoUrl,
          isVerified: trustProfile?.isVerified ?? false,
        }
      : null,
    todaySummary: {
      revenueToday: revenueTodayAvailable ? revenue.today : null,
      ordersToday,
      pendingOrders: needAction,
      productsNeedAttention: productBuckets.outOfStock + (productBuckets.lowStock ?? 0),
      unreadNotifications: notifications.length,
    },
    revenue:
      stats.revenue > 0 || revenue.month > 0
        ? {
            today: revenue.today,
            week: revenue.week,
            month: revenue.month,
            averageOrder: revenue.averageOrder,
          }
        : null,
    orderBuckets: {
      new: orderCounters.newCount,
      processing: orderCounters.inProgress,
      awaitingShipment: orderCounters.awaitingShipment,
      completed: completedCount,
    },
    productBuckets,
    tasks,
    notifications,
    insights:
      insights.bestSellingCategory || insights.mostViewedProduct
        ? insights
        : null,
    recentActivity,
    workspace,
    money: {
      available: wallet?.buckets.spendableAmount ?? 0,
      pending: wallet?.buckets.pendingFromSales ?? 0,
    },
    orders: { needAction },
    products: {
      active: productBuckets.active,
      needAttention: productBuckets.outOfStock,
    },
    promotion: { active: 0 },
    intelligence: { topAction: null, productId: null },
  });
}

export async function buildMobileSellerHomeFromRequest(request: Request): Promise<MobileSellerHomePayload> {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role)) {
    return buildMobileSellerHomePayload();
  }
  return buildMobileSellerHomeForUser(user.id, user.sellerProfileId);
}
