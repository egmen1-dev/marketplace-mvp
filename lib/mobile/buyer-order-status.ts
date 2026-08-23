import type { OrderStatus } from "@prisma/client";

/** Simplified buyer-facing status bucket for mobile closed beta. */
export type MobileBuyerOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

const PENDING_STATUSES: OrderStatus[] = ["NEW", "AWAITING_SELLER_CONFIRMATION", "PAID"];
const CONFIRMED_STATUSES: OrderStatus[] = [
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_SHIPMENT",
  "READY_FOR_PICKUP",
];
const SHIPPED_STATUSES: OrderStatus[] = ["SHIPPED", "IN_TRANSIT", "ARRIVED"];
const COMPLETED_STATUSES: OrderStatus[] = ["DELIVERED", "PICKED_UP", "COMPLETED"];

export function toMobileBuyerOrderStatus(status: OrderStatus | string): MobileBuyerOrderStatus {
  const normalized = String(status).toUpperCase() as OrderStatus;
  if (normalized === "CANCELLED" || normalized === "REJECTED") return "CANCELLED";
  if (PENDING_STATUSES.includes(normalized)) return "PENDING";
  if (CONFIRMED_STATUSES.includes(normalized)) return "CONFIRMED";
  if (SHIPPED_STATUSES.includes(normalized)) return "SHIPPED";
  if (COMPLETED_STATUSES.includes(normalized)) return "COMPLETED";
  return "PENDING";
}

export const MOBILE_BUYER_ORDER_STATUS_LABELS: Record<MobileBuyerOrderStatus, string> = {
  PENDING: "Ожидает подтверждения",
  CONFIRMED: "Продавец принял заказ",
  SHIPPED: "Передан в доставку",
  COMPLETED: "Заказ завершён",
  CANCELLED: "Заказ отменён",
};

export function formatMobileBuyerOrderStatus(status: OrderStatus | string): string {
  return MOBILE_BUYER_ORDER_STATUS_LABELS[toMobileBuyerOrderStatus(status)];
}

export type BuyerOrderProgressStep = {
  key: string;
  label: string;
  reached: boolean;
  current: boolean;
};

export function buildBuyerOrderProgressSteps(status: OrderStatus | string): BuyerOrderProgressStep[] {
  const bucket = toMobileBuyerOrderStatus(status);
  const steps: BuyerOrderProgressStep[] = [
    { key: "created", label: "Заказ создан", reached: true, current: false },
    { key: "confirm", label: "Продавец подтверждает", reached: false, current: false },
    { key: "delivery", label: "Доставка", reached: false, current: false },
    { key: "received", label: "Получение", reached: false, current: false },
  ];

  if (bucket === "CANCELLED") {
    return [{ key: "cancelled", label: "Заказ отменён", reached: true, current: true }];
  }

  const stage =
    bucket === "PENDING" ? 1
    : bucket === "CONFIRMED" ? 1
    : bucket === "SHIPPED" ? 2
    : 3;

  return steps.map((step, index) => ({
    ...step,
    reached: index <= stage,
    current: index === stage,
  }));
}
