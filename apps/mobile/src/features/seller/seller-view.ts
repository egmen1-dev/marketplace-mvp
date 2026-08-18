import type {
  SellerHomeActivity,
  SellerHomeDashboard,
  SellerHomeNotification,
  SellerHomeTask,
  SellerOrderSummary,
  SellerProduct,
  SellerPublicProfile,
} from "../../domain/contracts/entities/seller";
import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";

export const SELLER_ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  PAID: "Оплачен",
  AWAITING_SELLER_CONFIRMATION: "Ожидает подтверждения",
  CONFIRMED: "Подтверждён",
  PROCESSING: "Комплектуется",
  READY_FOR_SHIPMENT: "Готов к отправке",
  SHIPPED: "Отправлен",
  IN_TRANSIT: "В пути",
  ARRIVED: "Прибыл",
  READY_FOR_PICKUP: "Готов к выдаче",
  PICKED_UP: "Выдан",
  DELIVERED: "Доставлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
  REJECTED: "Отклонён",
  RETURN_REQUESTED: "Возврат запрошен",
  RETURN_APPROVED: "Возврат одобрен",
  RETURNED: "Возвращён",
  REFUNDED: "Возмещён",
};

export type SellerHomeHeaderView = {
  storeName: string;
  logoUrl: string | null;
  isVerified: boolean;
  dateLabel: string;
  offline: boolean;
};

export type SellerHomeTodayCardView = {
  id: string;
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

export type SellerHomeRevenueView = {
  today: number;
  week: number;
  month: number;
  averageOrder: number | null;
};

export type SellerHomeOrderBucketsView = {
  new: number;
  processing: number;
  awaitingShipment: number;
  completed: number;
};

export type SellerHomeProductBucketsView = {
  active: number;
  outOfStock: number;
  drafts: number;
  hidden: number;
  lowStock: number | null;
};

export type SellerHomeTaskView = SellerHomeTask;
export type SellerHomeNotificationView = SellerHomeNotification;
export type SellerHomeActivityView = SellerHomeActivity;

export type SellerHomeInsightView = {
  bestSellingCategory: string | null;
  mostViewedProduct: string | null;
  returningCustomersPct: number | null;
};

export type SellerHomeView = {
  header: SellerHomeHeaderView | null;
  todayCards: SellerHomeTodayCardView[];
  revenue: SellerHomeRevenueView | null;
  orderBuckets: SellerHomeOrderBucketsView | null;
  productBuckets: SellerHomeProductBucketsView | null;
  tasks: SellerHomeTaskView[];
  notifications: SellerHomeNotificationView[];
  insights: SellerHomeInsightView | null;
  recentActivity: SellerHomeActivityView[];
  money?: { available: number; pending: number };
  orders?: { needAction: number };
  products?: { active: number; needAttention: number };
};

function formatTodayDate(): string {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function sellerHomeToView(dashboard: SellerHomeDashboard, offline = false): SellerHomeView {
  const todayCards: SellerHomeTodayCardView[] = [];
  const summary = dashboard.todaySummary;

  if (summary?.revenueToday !== null && summary?.revenueToday !== undefined) {
    todayCards.push({
      id: "revenue-today",
      label: "Выручка сегодня",
      value: formatMoney(summary.revenueToday),
      tone: "success",
    });
  }
  if (summary && summary.ordersToday > 0) {
    todayCards.push({
      id: "orders-today",
      label: "Заказов сегодня",
      value: String(summary.ordersToday),
      tone: "neutral",
    });
  }
  if (summary && summary.pendingOrders > 0) {
    todayCards.push({
      id: "pending-orders",
      label: "Ожидают обработки",
      value: String(summary.pendingOrders),
      tone: "warning",
    });
  }
  if (summary && summary.productsNeedAttention > 0) {
    todayCards.push({
      id: "products-attention",
      label: "Товары требуют внимания",
      value: String(summary.productsNeedAttention),
      tone: "danger",
    });
  }
  if (summary && summary.unreadNotifications > 0) {
    todayCards.push({
      id: "notifications",
      label: "Уведомления",
      value: String(summary.unreadNotifications),
      tone: "neutral",
    });
  }

  return {
    header: dashboard.header
      ? {
          storeName: dashboard.header.storeName,
          logoUrl: dashboard.header.logoUrl,
          isVerified: dashboard.header.isVerified,
          dateLabel: formatTodayDate(),
          offline,
        }
      : null,
    todayCards,
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
    tasks: [...dashboard.tasks],
    notifications: [...dashboard.notifications],
    insights: dashboard.insights,
    recentActivity: [...dashboard.recentActivity],
    money: { available: dashboard.money.available.amount, pending: dashboard.money.pending.amount },
    orders: dashboard.orders,
    products: dashboard.products,
  };
}

export function sellerProductToCard(product: SellerProduct): MobileProductCardData & { status?: string } {
  return {
    id: product.id,
    title: product.title,
    price: product.price.amount,
    compareAt: product.compareAt?.amount ?? null,
    primaryImage: product.imageUrl ? { url: product.imageUrl } : null,
    stock: product.stock,
    status: product.status,
    favoritesCount: product.favoritesCount,
  };
}

export type SellerSaleCardView = {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  buyerName: string;
  sellerSubtotal: number;
  currency: string;
  itemCount: number;
  previewTitle: string | null;
  createdAtLabel: string;
  isOverdue: boolean;
};

function formatSellerSaleDate(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? createdAt
    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function sellerOrderToSaleCard(order: SellerOrderSummary): SellerSaleCardView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: SELLER_ORDER_STATUS_LABELS[order.status] ?? order.status,
    buyerName: order.buyerLabel?.trim() || "Покупатель",
    sellerSubtotal: order.total.amount,
    currency: order.total.currency,
    itemCount: 1,
    previewTitle: null,
    createdAtLabel: formatSellerSaleDate(order.createdAt),
    isOverdue: false,
  };
}

export type SellerPublicProfileView = {
  id: string;
  storeName: string;
  slug: string | null;
  description: string | null;
  isVerified: boolean;
  productCount: number;
};

export function sellerPublicProfileToView(profile: SellerPublicProfile): SellerPublicProfileView {
  return {
    id: profile.id,
    storeName: profile.storeName,
    slug: null,
    description: profile.subtitle,
    isVerified: false,
    productCount: profile.productCount,
  };
}

export function formatActivityTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
