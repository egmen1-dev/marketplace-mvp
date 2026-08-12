import type { OrderStatus } from "@prisma/client";

import { normalizeOrderStatus } from "@/features/order-lifecycle/lib/state-machine";

export type DeadlineType =
  | "confirmation"
  | "processing"
  | "shipment"
  | "pickup";

export type OrderDeadlineSnapshot = {
  status: OrderStatus;
  confirmationDeadline: Date | null;
  processingDeadline: Date | null;
  shipmentDeadline: Date | null;
  pickupExpiresAt: Date | null;
  isOverdue: boolean;
};

const CONFIRMATION_STATUSES = new Set<OrderStatus>([
  "AWAITING_SELLER_CONFIRMATION",
  "PAID",
]);

const PROCESSING_STATUSES = new Set<OrderStatus>([
  "CONFIRMED",
  "PROCESSING",
]);

const SHIPMENT_STATUSES = new Set<OrderStatus>([
  "READY_FOR_SHIPMENT",
]);

const PICKUP_STATUSES = new Set<OrderStatus>([
  "READY_FOR_PICKUP",
]);

/**
 * Which deadline (if any) is breached for the current status.
 * Returns null when not overdue or already flagged.
 */
export function detectBreachedDeadline(
  order: OrderDeadlineSnapshot,
  now: Date = new Date(),
): { type: DeadlineType; deadline: Date } | null {
  if (order.isOverdue) return null;
  const status = normalizeOrderStatus(order.status);

  if (
    CONFIRMATION_STATUSES.has(status) &&
    order.confirmationDeadline &&
    now.getTime() > order.confirmationDeadline.getTime()
  ) {
    return { type: "confirmation", deadline: order.confirmationDeadline };
  }

  if (
    PROCESSING_STATUSES.has(status) &&
    order.processingDeadline &&
    now.getTime() > order.processingDeadline.getTime()
  ) {
    return { type: "processing", deadline: order.processingDeadline };
  }

  if (
    SHIPMENT_STATUSES.has(status) &&
    order.shipmentDeadline &&
    now.getTime() > order.shipmentDeadline.getTime()
  ) {
    return { type: "shipment", deadline: order.shipmentDeadline };
  }

  if (
    PICKUP_STATUSES.has(status) &&
    order.pickupExpiresAt &&
    now.getTime() > order.pickupExpiresAt.getTime()
  ) {
    return { type: "pickup", deadline: order.pickupExpiresAt };
  }

  // Fallback: shipment deadline also covers CONFIRMED/PROCESSING when
  // processingDeadline was never set (legacy rows).
  if (
    PROCESSING_STATUSES.has(status) &&
    !order.processingDeadline &&
    order.shipmentDeadline &&
    now.getTime() > order.shipmentDeadline.getTime()
  ) {
    return { type: "shipment", deadline: order.shipmentDeadline };
  }

  return null;
}

export const DEADLINE_LABELS: Record<DeadlineType, string> = {
  confirmation: "Подтверждение продавцом",
  processing: "Комплектация",
  shipment: "Отправка",
  pickup: "Срок хранения самовывоза",
};
