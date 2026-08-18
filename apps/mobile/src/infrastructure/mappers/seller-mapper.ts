import type {
  SellerHomeActivity,
  SellerHomeDashboard,
  SellerHomeHeader,
  SellerHomeInsight,
  SellerHomeNotification,
  SellerHomeOrderBuckets,
  SellerHomeProductBuckets,
  SellerHomeRevenue,
  SellerHomeTask,
  SellerHomeTodaySummary,
  SellerOrderPage,
  SellerOrderSummary,
  SellerProduct,
  SellerProductPage,
  SellerPublicProfile,
  SellerWorkspace,
  SellerWorkspaceItem,
} from "../../domain/contracts/entities/seller";
import { orderId, productId, sellerId } from "../../domain/contracts/value-objects/ids";
import { money } from "../../domain/contracts/value-objects/money";
import { mapProductSummaryDto, type MobileProductListDto } from "./commerce-mapper";

export type SellerHomeDto = {
  header: { storeName: string; logoUrl: string | null; isVerified: boolean } | null;
  todaySummary: {
    revenueToday: number | null;
    ordersToday: number;
    pendingOrders: number;
    productsNeedAttention: number;
    unreadNotifications: number;
  } | null;
  revenue: {
    today: number;
    week: number;
    month: number;
    averageOrder: number | null;
  } | null;
  orderBuckets: {
    new: number;
    processing: number;
    awaitingShipment: number;
    completed: number;
  } | null;
  productBuckets: {
    active: number;
    outOfStock: number;
    drafts: number;
    hidden: number;
    lowStock: number | null;
  } | null;
  tasks: Array<{ id: string; title: string; action: SellerHomeTask["action"] }>;
  notifications: Array<{
    id: string;
    kind: SellerHomeNotification["kind"];
    title: string;
    body: string;
    createdAt: string;
  }>;
  insights: {
    bestSellingCategory: string | null;
    mostViewedProduct: string | null;
    returningCustomersPct: number | null;
  } | null;
  recentActivity: Array<{
    id: string;
    kind: SellerHomeActivity["kind"];
    title: string;
    subtitle: string;
    createdAt: string;
  }>;
  workspace: {
    items: Array<{
      id: string;
      title: string;
      subtitle: string | null;
      priority: SellerWorkspaceItem["priority"];
      source: SellerWorkspaceItem["source"];
      section: SellerWorkspaceItem["section"];
      action: SellerWorkspaceItem["action"];
      entityId: string | null;
      resumeKey: string | null;
      completedAt: string | null;
      actionKind: SellerWorkspaceItem["actionKind"];
      actionPayload: SellerWorkspaceItem["actionPayload"];
      supportsUndo: boolean;
    }>;
    counts: SellerWorkspace["counts"];
  };
  money: { available: number; pending: number };
  orders: { needAction: number };
  products: { active: number; needAttention: number };
  promotion: { active: number };
  intelligence: {
    topAction: string | null;
    productId: string | null;
    confidence?: number;
    reason?: string;
  };
};

export type SellerOrderDto = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  sellerSubtotal: number;
  currency: string;
  createdAt: string;
  buyerName: string | null;
};

export type SellerPublicProfileDto = {
  id: string;
  storeName: string;
  slug: string | null;
  description: string | null;
  isVerified: boolean;
  productCount: number;
  available: boolean;
};

function mapHeader(dto: SellerHomeDto["header"]): SellerHomeHeader | null {
  if (!dto) return null;
  return {
    storeName: dto.storeName,
    logoUrl: dto.logoUrl,
    isVerified: dto.isVerified,
  };
}

function mapTodaySummary(dto: SellerHomeDto["todaySummary"]): SellerHomeTodaySummary | null {
  if (!dto) return null;
  return { ...dto };
}

function mapRevenue(dto: SellerHomeDto["revenue"]): SellerHomeRevenue | null {
  if (!dto) return null;
  return {
    today: money(dto.today, "RUB"),
    week: money(dto.week, "RUB"),
    month: money(dto.month, "RUB"),
    averageOrder: dto.averageOrder !== null ? money(dto.averageOrder, "RUB") : null,
  };
}

function mapOrderBuckets(dto: SellerHomeDto["orderBuckets"]): SellerHomeOrderBuckets | null {
  if (!dto) return null;
  return { ...dto };
}

function mapProductBuckets(dto: SellerHomeDto["productBuckets"]): SellerHomeProductBuckets | null {
  if (!dto) return null;
  return { ...dto };
}

export function mapSellerHomeDto(dto: SellerHomeDto): SellerHomeDashboard {
  return {
    header: mapHeader(dto.header),
    todaySummary: mapTodaySummary(dto.todaySummary),
    revenue: mapRevenue(dto.revenue),
    orderBuckets: mapOrderBuckets(dto.orderBuckets),
    productBuckets: mapProductBuckets(dto.productBuckets),
    tasks: dto.tasks.map((task) => ({ ...task })),
    notifications: dto.notifications.map((n) => ({ ...n })),
    insights: dto.insights ? { ...dto.insights } : null,
    recentActivity: dto.recentActivity.map((a) => ({ ...a })),
    workspace: {
      items: dto.workspace.items.map((item) => ({ ...item })),
      counts: { ...dto.workspace.counts },
    },
    money: {
      available: money(dto.money.available, "RUB"),
      pending: money(dto.money.pending, "RUB"),
    },
    orders: { needAction: dto.orders.needAction },
    products: { active: dto.products.active, needAttention: dto.products.needAttention },
    promotion: { active: dto.promotion.active },
    intelligence: {
      topAction: dto.intelligence.topAction,
      productId: dto.intelligence.productId ? productId(dto.intelligence.productId) : null,
      confidence: dto.intelligence.confidence ?? null,
      reason: dto.intelligence.reason ?? null,
    },
  };
}

export function mapSellerProductDto(dto: MobileProductListDto): SellerProduct {
  return {
    ...mapProductSummaryDto(dto),
    status: dto.status ?? "ACTIVE",
    views: dto.views ?? 0,
  };
}

export function mapSellerProductPageDto(dto: {
  items: MobileProductListDto[];
  nextCursor: string | null;
}): SellerProductPage {
  return {
    items: dto.items.map(mapSellerProductDto),
    nextCursor: dto.nextCursor,
    fromCache: false,
  };
}

export function mapSellerOrderSummaryDto(dto: SellerOrderDto): SellerOrderSummary {
  return {
    id: orderId(dto.id),
    orderNumber: dto.orderNumber,
    status: dto.status,
    total: money(dto.sellerSubtotal || dto.total, dto.currency || "RUB"),
    buyerLabel: dto.buyerName,
    createdAt: dto.createdAt,
  };
}

export function mapSellerOrderPageDto(dto: { items: SellerOrderDto[]; nextCursor: string | null }): SellerOrderPage {
  return {
    items: dto.items.map(mapSellerOrderSummaryDto),
    nextCursor: dto.nextCursor,
    fromCache: false,
  };
}

export function mapSellerPublicProfileDto(dto: SellerPublicProfileDto): SellerPublicProfile {
  return {
    id: sellerId(dto.id),
    storeName: dto.storeName,
    subtitle: dto.description ?? dto.slug,
    rating: null,
    productCount: dto.productCount,
  };
}

export function sellerHomeDashboardToSnapshot(dashboard: SellerHomeDashboard) {
  return {
    header: dashboard.header,
    todaySummary: dashboard.todaySummary,
    revenue: dashboard.revenue
      ? {
          today: dashboard.revenue.today.amount,
          week: dashboard.revenue.week.amount,
          month: dashboard.revenue.month.amount,
          averageOrder: dashboard.revenue.averageOrder?.amount ?? null,
        }
      : null,
    orderBuckets: dashboard.orderBuckets,
    productBuckets: dashboard.productBuckets,
    tasks: dashboard.tasks,
    notifications: dashboard.notifications,
    insights: dashboard.insights,
    recentActivity: dashboard.recentActivity,
    workspace: dashboard.workspace,
    money: { available: dashboard.money.available.amount, pending: dashboard.money.pending.amount },
    orders: dashboard.orders,
    products: dashboard.products,
    promotion: dashboard.promotion,
    intelligence: {
      topAction: dashboard.intelligence.topAction,
      productId: dashboard.intelligence.productId,
      confidence: dashboard.intelligence.confidence ?? undefined,
      reason: dashboard.intelligence.reason ?? undefined,
    },
  };
}

export function sellerOrderSummaryToSaleCard(order: SellerOrderSummary) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    sellerSubtotal: order.total.amount,
    currency: order.total.currency,
    createdAt: order.createdAt,
    buyerName: order.buyerLabel,
    itemCount: 1,
    sellerItemNames: [] as string[],
    isOverdue: false,
    fulfillmentType: "DELIVERY" as const,
  };
}
