import { loadAppConfig } from "../../config/env";
import { resolveImageUrl } from "../../utils/format";
import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";

export type OrderStatusCode =
  | "NEW"
  | "PAID"
  | "AWAITING_SELLER_CONFIRMATION"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY_FOR_SHIPMENT"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURNED"
  | "REFUNDED";

export const ORDER_STATUS_LABELS: Record<OrderStatusCode, string> = {
  NEW: "Создан",
  PAID: "Оплачен",
  AWAITING_SELLER_CONFIRMATION: "Передан продавцу",
  CONFIRMED: "Подтверждён",
  PROCESSING: "Оформляется",
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
  RETURN_REQUESTED: "Запрошен возврат",
  RETURN_APPROVED: "Возврат одобрен",
  RETURNED: "Возвращён",
  REFUNDED: "Возврат средств",
};

const COMPLETED_STATUSES = new Set<OrderStatusCode>([
  "DELIVERED",
  "PICKED_UP",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "RETURNED",
  "REFUNDED",
]);

export type OrderListCardView = {
  id: string;
  orderNumber: string;
  status: OrderStatusCode;
  statusLabel: string;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  createdAtLabel: string;
  isActive: boolean;
  previewTitle: string | null;
  previewImageUrl: string | null;
  sellerName: string | null;
};

export type OrderTimelineStep = {
  id: string;
  status: OrderStatusCode;
  label: string;
  timestamp: string;
  timestampLabel: string;
  isCurrent: boolean;
};

export type OrderItemView = {
  id: string;
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string | null;
};

export type OrderDetailView = {
  id: string;
  orderNumber: string;
  status: OrderStatusCode;
  statusLabel: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  createdAtLabel: string;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientCity: string | null;
  sellerName: string | null;
  items: OrderItemView[];
  timeline: OrderTimelineStep[];
  expectedNextAction: string | null;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseStatus(value: unknown): OrderStatusCode {
  const code = String(value ?? "NEW") as OrderStatusCode;
  return ORDER_STATUS_LABELS[code] ? code : "NEW";
}

export function formatOrderDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isActiveOrderStatus(status: OrderStatusCode): boolean {
  return !COMPLETED_STATUSES.has(status);
}

export function parseOrderListItem(raw: Record<string, unknown>): OrderListCardView {
  const status = parseStatus(raw.status);
  const createdAt = String(raw.createdAt ?? new Date().toISOString());
  return {
    id: String(raw.id ?? ""),
    orderNumber: String(raw.orderNumber ?? raw.number ?? raw.id ?? ""),
    status,
    statusLabel: ORDER_STATUS_LABELS[status],
    total: readNumber(raw.total ?? raw.totalAmount),
    currency: readString(raw.currency) ?? "RUB",
    itemCount: readNumber(raw.itemCount, 1),
    createdAt,
    createdAtLabel: formatOrderDateLabel(createdAt),
    isActive: isActiveOrderStatus(status),
    previewTitle: null,
    previewImageUrl: null,
    sellerName: null,
  };
}

export function mergeOrderPreview(
  card: OrderListCardView,
  detail: OrderDetailView | null,
): OrderListCardView {
  if (!detail || detail.id !== card.id) return card;
  const first = detail.items[0];
  return {
    ...card,
    previewTitle: first?.title ?? card.previewTitle,
    previewImageUrl: first?.imageUrl ?? card.previewImageUrl,
    sellerName: detail.sellerName ?? card.sellerName,
  };
}

export function parseOrderDetail(raw: Record<string, unknown>): OrderDetailView {
  const config = loadAppConfig();
  const status = parseStatus(raw.status);
  const createdAt = String(raw.createdAt ?? new Date().toISOString());
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const historyRaw = Array.isArray(raw.history) ? raw.history : [];

  const items: OrderItemView[] = itemsRaw.map((entry, index) => {
    const row = entry as Record<string, unknown>;
    const product = row.product as Record<string, unknown> | undefined;
    const image = (row.primaryImage ?? product?.primaryImage) as { url?: string } | null | undefined;
    return {
      id: String(row.id ?? `${index}`),
      productId: String(row.productId ?? ""),
      title: String(row.productName ?? row.title ?? "Товар"),
      quantity: readNumber(row.quantity, 1),
      unitPrice: readNumber(row.unitPrice ?? row.price),
      totalPrice: readNumber(row.totalPrice ?? row.lineTotal),
      imageUrl: resolveImageUrl(image?.url ?? null, config.apiBaseUrl),
    };
  });

  const timeline: OrderTimelineStep[] = historyRaw.map((entry, index) => {
    const row = entry as Record<string, unknown>;
    const stepStatus = parseStatus(row.toStatus ?? row.status);
    const timestamp = String(row.createdAt ?? createdAt);
    return {
      id: String(row.id ?? `step-${index}`),
      status: stepStatus,
      label: ORDER_STATUS_LABELS[stepStatus],
      timestamp,
      timestampLabel: formatOrderDateLabel(timestamp),
      isCurrent: false,
    };
  });

  if (timeline.length === 0) {
    timeline.push({
      id: "current",
      status,
      label: ORDER_STATUS_LABELS[status],
      timestamp: createdAt,
      timestampLabel: formatOrderDateLabel(createdAt),
      isCurrent: true,
    });
  } else {
    timeline[timeline.length - 1]!.isCurrent = true;
  }

  const shipping = raw.shipping as Record<string, unknown> | null | undefined;

  return {
    id: String(raw.id ?? ""),
    orderNumber: String(raw.orderNumber ?? raw.number ?? raw.id ?? ""),
    status,
    statusLabel: ORDER_STATUS_LABELS[status],
    subtotal: readNumber(raw.subtotal, readNumber(raw.total)),
    shippingCost: readNumber(raw.shippingCost),
    total: readNumber(raw.total),
    currency: readString(raw.currency) ?? "RUB",
    notes: readString(raw.notes),
    createdAt,
    createdAtLabel: formatOrderDateLabel(createdAt),
    recipientName: readString(shipping?.fullName),
    recipientPhone: readString(shipping?.phone),
    recipientCity: readString(shipping?.city),
    sellerName: null,
    items,
    timeline,
    expectedNextAction: readString(raw.expectedNextAction),
  };
}

export function mergeSellerName(detail: OrderDetailView, sellerName: string | null): OrderDetailView {
  return { ...detail, sellerName };
}

export function toRecommendationSeed(detail: OrderDetailView): MobileProductCardData | null {
  const first = detail.items[0];
  if (!first) return null;
  return {
    id: first.productId,
    title: first.title,
    price: first.unitPrice,
    primaryImage: first.imageUrl ? { url: first.imageUrl } : null,
  };
}
