import type { OrderStatus } from "@prisma/client";

import { normalizeOrderStatus } from "@/features/order-lifecycle/lib/state-machine";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новый",
  PAID: "Ожидает подтверждения",
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
  RETURN_REQUESTED: "Запрошен возврат",
  RETURN_APPROVED: "Возврат одобрен",
  RETURNED: "Возвращён",
  REFUNDED: "Возврат средств",
};

export type OrderStatusBadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive";

export const ORDER_STATUS_VARIANTS: Record<
  OrderStatus,
  OrderStatusBadgeVariant
> = {
  NEW: "secondary",
  PAID: "default",
  AWAITING_SELLER_CONFIRMATION: "default",
  CONFIRMED: "default",
  PROCESSING: "default",
  READY_FOR_SHIPMENT: "outline",
  SHIPPED: "outline",
  IN_TRANSIT: "outline",
  ARRIVED: "outline",
  READY_FOR_PICKUP: "outline",
  PICKED_UP: "outline",
  DELIVERED: "outline",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  REJECTED: "destructive",
  RETURN_REQUESTED: "secondary",
  RETURN_APPROVED: "secondary",
  RETURNED: "secondary",
  REFUNDED: "secondary",
};

export function formatOrderStatus(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[normalizeOrderStatus(status)] ?? status;
}

/** Deterministic Moscow datetime — no Intl (avoids SSR/client #418). */
export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  // Europe/Moscow is UTC+3 without DST since 2014.
  const ms = d.getTime() + 3 * 60 * 60 * 1000;
  const m = new Date(ms);
  const day = m.getUTCDate();
  const monthIdx = m.getUTCMonth();
  const year = m.getUTCFullYear();
  const hour = String(m.getUTCHours()).padStart(2, "0");
  const minute = String(m.getUTCMinutes()).padStart(2, "0");
  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  return `${day} ${months[monthIdx] ?? ""} ${year}, ${hour}:${minute}`;
}

/** Seller dashboard filter buckets (status groups). */
export const SELLER_ORDER_FILTER_BUCKETS = {
  NEW: [
    "NEW",
    "AWAITING_SELLER_CONFIRMATION",
    "PAID",
  ] as OrderStatus[],
  AWAITING_CONFIRMATION: [
    "AWAITING_SELLER_CONFIRMATION",
    "PAID",
  ] as OrderStatus[],
  PROCESSING: ["CONFIRMED", "PROCESSING"] as OrderStatus[],
  READY: ["READY_FOR_SHIPMENT", "READY_FOR_PICKUP"] as OrderStatus[],
  SHIPPED: ["SHIPPED", "IN_TRANSIT", "ARRIVED"] as OrderStatus[],
  PROBLEM: [
    "REJECTED",
    "RETURN_REQUESTED",
    "RETURN_APPROVED",
    "RETURNED",
    "REFUNDED",
  ] as OrderStatus[],
  CANCELLED: ["CANCELLED"] as OrderStatus[],
  COMPLETED: ["DELIVERED", "PICKED_UP", "COMPLETED"] as OrderStatus[],
} as const;

export type SellerOrderFilterBucket = keyof typeof SELLER_ORDER_FILTER_BUCKETS;
