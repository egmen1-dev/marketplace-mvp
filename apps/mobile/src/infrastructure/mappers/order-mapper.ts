import { loadAppConfig } from "../../config/env";
import { resolveImageUrl } from "../../utils/format";
import type { OrderDetail, OrderSummary } from "../../domain/contracts/entities/order";
import { orderId, productId } from "../../domain/contracts/value-objects/ids";
import { money } from "../../domain/contracts/value-objects/money";

const STATUS_MAP: Record<string, OrderSummary["status"]> = {
  NEW: "pending",
  PAID: "paid",
  AWAITING_SELLER_CONFIRMATION: "processing",
  CONFIRMED: "processing",
  PROCESSING: "processing",
  READY_FOR_SHIPMENT: "processing",
  SHIPPED: "shipped",
  IN_TRANSIT: "shipped",
  ARRIVED: "shipped",
  READY_FOR_PICKUP: "shipped",
  PICKED_UP: "delivered",
  DELIVERED: "delivered",
  COMPLETED: "delivered",
  CANCELLED: "cancelled",
  REJECTED: "cancelled",
  RETURN_REQUESTED: "refunded",
  RETURN_APPROVED: "refunded",
  RETURNED: "refunded",
  REFUNDED: "refunded",
};

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function mapStatus(raw: unknown): OrderSummary["status"] {
  const code = String(raw ?? "NEW");
  return STATUS_MAP[code] ?? "pending";
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function mapOrderSummaryDto(raw: Record<string, unknown>): OrderSummary {
  const config = loadAppConfig();
  const currency = readString(raw.currency) ?? "RUB";
  const createdAt = String(raw.createdAt ?? new Date().toISOString());
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const first = itemsRaw[0] as Record<string, unknown> | undefined;
  const image = (first?.primaryImage ?? (first?.product as Record<string, unknown> | undefined)?.primaryImage) as
    | { url?: string }
    | null
    | undefined;

  return {
    id: orderId(String(raw.id ?? "")),
    orderNumber: String(raw.orderNumber ?? raw.number ?? raw.id ?? ""),
    status: mapStatus(raw.status),
    total: money(readNumber(raw.total ?? raw.totalAmount), currency),
    itemCount: readNumber(raw.itemCount, itemsRaw.length || 1),
    createdAt,
    previewImageUrl: resolveImageUrl(image?.url ?? null, config.apiBaseUrl),
  };
}

export function mapOrderDetailDto(raw: Record<string, unknown>): OrderDetail {
  const config = loadAppConfig();
  const summary = mapOrderSummaryDto(raw);
  const currency = summary.total.currency;
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const historyRaw = Array.isArray(raw.history) ? raw.history : [];

  const lines = itemsRaw.map((entry) => {
    const row = entry as Record<string, unknown>;
    const product = row.product as Record<string, unknown> | undefined;
    const image = (row.primaryImage ?? product?.primaryImage) as { url?: string } | null | undefined;
    return {
      productId: productId(String(row.productId ?? "")),
      title: String(row.productName ?? row.title ?? "Товар"),
      quantity: readNumber(row.quantity, 1),
      price: money(readNumber(row.unitPrice ?? row.price), currency),
      imageUrl: resolveImageUrl(image?.url ?? null, config.apiBaseUrl),
    };
  });

  const timeline =
    historyRaw.length > 0
      ? historyRaw.map((entry, index) => {
          const row = entry as Record<string, unknown>;
          const timestamp = String(row.createdAt ?? summary.createdAt);
          const label = readString(row.label) ?? String(row.toStatus ?? row.status ?? summary.status);
          return {
            id: String(row.id ?? `step-${index}`),
            label,
            timestampLabel: formatDateLabel(timestamp),
            isCurrent: index === historyRaw.length - 1,
          };
        })
      : [
          {
            id: "current",
            label: summary.status,
            timestampLabel: formatDateLabel(summary.createdAt),
            isCurrent: true,
          },
        ];

  const shipping = raw.shipping as Record<string, unknown> | null | undefined;
  const deliveryParts = [readString(shipping?.city), readString(shipping?.fullName)].filter(Boolean);

  return {
    ...summary,
    lines,
    timeline,
    deliveryLabel: deliveryParts.length ? deliveryParts.join(" · ") : null,
    paymentLabel: readString(raw.paymentMethod) ?? null,
  };
}

export function mapSharePayload(orderIdValue: string, orderNumber: string): import("../../domain/contracts/entities/order").SharePayload {
  const uri = `lot://order/${orderIdValue}`;
  return { uri, message: `Заказ ${orderNumber} в LOT — ${uri}` };
}
