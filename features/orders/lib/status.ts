import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новый",
  PAID: "Оплачен",
  PROCESSING: "В обработке",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
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
  PROCESSING: "default",
  SHIPPED: "outline",
  DELIVERED: "outline",
  CANCELLED: "destructive",
};

export function formatOrderStatus(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function formatOrderDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(iso));
}
