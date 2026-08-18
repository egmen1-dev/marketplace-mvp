import type {
  SellerHomeDashboard,
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

export type SellerHomeView = {
  money?: { available: number; pending: number };
  orders?: { needAction: number };
  products?: { active: number; needAttention: number };
  promotion?: { active: number };
  intelligence?: {
    topAction: string | null;
    productId: string | null;
    confidence?: number;
    reason?: string;
  };
};

export function sellerHomeToView(dashboard: SellerHomeDashboard): SellerHomeView {
  return {
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
    slug: profile.slug,
    description: profile.description ?? profile.subtitle,
    isVerified: profile.isVerified,
    productCount: profile.productCount,
  };
}
