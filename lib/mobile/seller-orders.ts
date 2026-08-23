import type { OrderStatus } from "@prisma/client";

import { formatOrderStatus } from "@/features/orders/lib/status";

/** Simplified mobile seller order status for API consumers. */
export type MobileSellerOrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export type MobileSellerOrderTab = "new" | "in_progress" | "completed";

export type MobileSellerOrderProduct = {
  id: string | null;
  title: string;
  imageUrl: string | null;
};

export type MobileSellerOrderBuyer = {
  name: string | null;
  email: string;
};

export type MobileSellerOrderItem = {
  id: string;
  orderNumber: string;
  status: MobileSellerOrderStatus;
  rawStatus: OrderStatus;
  product: MobileSellerOrderProduct;
  quantity: number;
  amount: number;
  currency: string;
  buyer: MobileSellerOrderBuyer;
  createdAt: string;
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP";
};

export type MobileSellerOrdersPayload = {
  orders: MobileSellerOrderItem[];
  tab: MobileSellerOrderTab;
  total: number;
};

const NEW_STATUSES: OrderStatus[] = ["NEW", "AWAITING_SELLER_CONFIRMATION", "PAID"];
const IN_PROGRESS_STATUSES: OrderStatus[] = [
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_SHIPMENT",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "IN_TRANSIT",
  "ARRIVED",
];
const COMPLETED_STATUSES: OrderStatus[] = [
  "DELIVERED",
  "PICKED_UP",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "RETURNED",
  "REFUNDED",
];

export function mobileSellerOrderTabToStatuses(tab: MobileSellerOrderTab): OrderStatus[] {
  if (tab === "new") return NEW_STATUSES;
  if (tab === "in_progress") return IN_PROGRESS_STATUSES;
  return COMPLETED_STATUSES;
}

export function toMobileSellerOrderStatus(status: OrderStatus): MobileSellerOrderStatus {
  if (NEW_STATUSES.includes(status)) return "NEW";
  if (["CONFIRMED", "PROCESSING", "READY_FOR_SHIPMENT", "READY_FOR_PICKUP"].includes(status)) {
    return "CONFIRMED";
  }
  if (["SHIPPED", "IN_TRANSIT", "ARRIVED"].includes(status)) return "SHIPPED";
  if (COMPLETED_STATUSES.includes(status)) {
    return status === "CANCELLED" ? "CANCELLED" : "COMPLETED";
  }
  return "NEW";
}

export function mobileSellerOrderStatusLabel(status: MobileSellerOrderStatus): string {
  switch (status) {
    case "NEW":
      return "Новый";
    case "CONFIRMED":
      return "Подтверждён";
    case "SHIPPED":
      return "Отправлен";
    case "COMPLETED":
      return "Завершён";
    case "CANCELLED":
      return "Отменён";
    default:
      return status;
  }
}

export function buyerOrderTimelineLabel(status: OrderStatus): string {
  if (NEW_STATUSES.includes(status)) return "Ожидает подтверждения";
  if (["CONFIRMED", "PROCESSING", "READY_FOR_SHIPMENT", "READY_FOR_PICKUP"].includes(status)) {
    return "Принят продавцом";
  }
  if (["SHIPPED", "IN_TRANSIT", "ARRIVED"].includes(status)) return "Отправлен";
  if (["DELIVERED", "PICKED_UP", "COMPLETED"].includes(status)) return "Завершён";
  if (status === "CANCELLED") return "Отменён";
  return formatOrderStatus(status);
}

export function buyerOrderTimelineEmoji(status: OrderStatus): string {
  if (NEW_STATUSES.includes(status)) return "🟠";
  if (["CONFIRMED", "PROCESSING", "READY_FOR_SHIPMENT", "READY_FOR_PICKUP"].includes(status)) {
    return "🟢";
  }
  if (["SHIPPED", "IN_TRANSIT", "ARRIVED"].includes(status)) return "🚚";
  if (["DELIVERED", "PICKED_UP", "COMPLETED"].includes(status)) return "✅";
  if (status === "CANCELLED") return "⚫";
  return "•";
}
