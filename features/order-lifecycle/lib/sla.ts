import type { OrderFulfillmentType } from "@prisma/client";

const MS_DAY = 24 * 60 * 60 * 1000;

/** Add N calendar days (MVP — not business-day calendar). */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MS_DAY);
}

export type OrderSlaDefaults = {
  handlingDays: number;
  confirmationDeadline: Date;
  shipmentDeadline: Date;
  pickupExpiresAt: Date | null;
  estimatedDeliveryAt: Date | null;
};

/**
 * SLA clocks after payment / awaiting confirmation.
 * Does not invent carrier ETAs — uses seller handlingDays only when no delivery estimate.
 */
export function buildSlaAfterPayment(opts: {
  now?: Date;
  handlingDays: number;
  fulfillmentType: OrderFulfillmentType;
  deliveryEstimatedMaxDays?: number | null;
}): OrderSlaDefaults {
  const now = opts.now ?? new Date();
  const handling = Math.max(1, opts.handlingDays);
  const confirmationDeadline = addDays(now, 1);
  const shipmentDeadline = addDays(now, handling);

  const pickup =
    opts.fulfillmentType === "SELLER_PICKUP"
      ? addDays(shipmentDeadline, 3)
      : null;

  let estimatedDeliveryAt: Date | null = null;
  if (opts.fulfillmentType === "DELIVERY") {
    const carrierDays =
      opts.deliveryEstimatedMaxDays != null &&
      opts.deliveryEstimatedMaxDays > 0
        ? opts.deliveryEstimatedMaxDays
        : null;
    if (carrierDays != null) {
      estimatedDeliveryAt = addDays(shipmentDeadline, carrierDays);
    } else {
      // Honest fallback: only handling window, not a fake carrier date.
      estimatedDeliveryAt = shipmentDeadline;
    }
  }

  return {
    handlingDays: handling,
    confirmationDeadline,
    shipmentDeadline,
    pickupExpiresAt: pickup,
    estimatedDeliveryAt,
  };
}

export function isConfirmationOverdue(opts: {
  confirmationDeadline: Date | null;
  status: string;
  now?: Date;
}): boolean {
  if (!opts.confirmationDeadline) return false;
  if (
    opts.status !== "AWAITING_SELLER_CONFIRMATION" &&
    opts.status !== "PAID"
  ) {
    return false;
  }
  const now = opts.now ?? new Date();
  return now.getTime() > opts.confirmationDeadline.getTime();
}

export function isShipmentOverdue(opts: {
  shipmentDeadline: Date | null;
  status: string;
  now?: Date;
}): boolean {
  if (!opts.shipmentDeadline) return false;
  const waiting = new Set([
    "CONFIRMED",
    "PROCESSING",
    "READY_FOR_SHIPMENT",
  ]);
  if (!waiting.has(opts.status)) return false;
  const now = opts.now ?? new Date();
  return now.getTime() > opts.shipmentDeadline.getTime();
}
