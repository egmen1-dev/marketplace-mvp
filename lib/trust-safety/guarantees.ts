import type { OrderStatus } from "@prisma/client";

import type { BuyerProtectionState } from "./buyer-protection";
import {
  CHECKOUT_SAFE_DEAL_STEPS,
  PDP_WHY_TRUST_ITEMS,
  SELLER_PAYOUT_EDUCATION_STEPS,
} from "./guarantees-copy";

export {
  CHECKOUT_SAFE_DEAL_STEPS,
  PDP_WHY_TRUST_ITEMS,
  SELLER_PAYOUT_EDUCATION_STEPS,
};

export type TrustTimelineStep = {
  id: string;
  label: string;
  state: "done" | "current" | "upcoming";
};

const STEPS: Array<{ id: string; label: string }> = [
  { id: "paid", label: "Оплата получена" },
  { id: "processing", label: "Продавец готовит заказ" },
  { id: "delivery", label: "Доставка" },
  { id: "received", label: "Получение товара" },
  { id: "confirm", label: "Подтверждение" },
  { id: "payout", label: "Выплата продавцу" },
];

function stepIndexForProtection(
  protection: BuyerProtectionState | null,
  orderStatus: OrderStatus,
): number {
  if (protection === "DISPUTE_OPEN") return 4;
  if (protection === "FUNDS_RELEASED" || orderStatus === "COMPLETED") return 5;
  if (protection === "BUYER_CONFIRMATION") return 4;
  if (protection === "DELIVERY_PENDING") return 3;
  if (protection === "SELLER_PROCESSING") return 1;
  if (protection === "PAYMENT_PROTECTED") return 0;
  if (orderStatus === "NEW") return -1;
  return 0;
}

/** Order trust timeline — display only, no OMS changes. */
export function buildOrderTrustTimeline(input: {
  orderStatus: OrderStatus;
  protection: BuyerProtectionState | null;
}): TrustTimelineStep[] {
  const current = stepIndexForProtection(input.protection, input.orderStatus);
  return STEPS.map((step, index) => ({
    ...step,
    state:
      current < 0
        ? "upcoming"
        : index < current
          ? "done"
          : index === current
            ? "current"
            : "upcoming",
  }));
}
