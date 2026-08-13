import type { OrderStatus, PaymentStatus } from "@prisma/client";

/**
 * Buyer-facing protection lifecycle (derived — does not alter OMS).
 * Linked conceptually to Order + FinanceTransaction state.
 */
export const BUYER_PROTECTION_STATES = [
  "PAYMENT_PROTECTED",
  "SELLER_PROCESSING",
  "DELIVERY_PENDING",
  "BUYER_CONFIRMATION",
  "FUNDS_RELEASED",
  "DISPUTE_OPEN",
] as const;

export type BuyerProtectionState = (typeof BUYER_PROTECTION_STATES)[number];

export type BuyerProtectionInput = {
  orderStatus: OrderStatus;
  paymentStatus?: PaymentStatus | null;
  hasOpenDispute?: boolean;
  fundsReleased?: boolean;
};

const PROCESSING: OrderStatus[] = [
  "AWAITING_SELLER_CONFIRMATION",
  "PAID",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_SHIPMENT",
];

const DELIVERY: OrderStatus[] = [
  "SHIPPED",
  "IN_TRANSIT",
  "ARRIVED",
  "READY_FOR_PICKUP",
];

const CONFIRMATION: OrderStatus[] = ["DELIVERED", "PICKED_UP"];

/**
 * Map OMS + finance + dispute into a buyer protection label.
 * Prefer DISPUTE_OPEN and FUNDS_RELEASED over intermediate states.
 */
export function deriveBuyerProtectionState(
  input: BuyerProtectionInput,
): BuyerProtectionState | null {
  if (input.hasOpenDispute) return "DISPUTE_OPEN";
  if (input.fundsReleased || input.orderStatus === "COMPLETED") {
    return "FUNDS_RELEASED";
  }

  const paid =
    input.paymentStatus === "SUCCEEDED" ||
    (input.orderStatus !== "NEW" &&
      input.orderStatus !== "CANCELLED" &&
      input.orderStatus !== "REJECTED");

  if (!paid) return null;

  if (CONFIRMATION.includes(input.orderStatus)) return "BUYER_CONFIRMATION";
  if (DELIVERY.includes(input.orderStatus)) return "DELIVERY_PENDING";
  if (PROCESSING.includes(input.orderStatus)) return "SELLER_PROCESSING";
  return "PAYMENT_PROTECTED";
}

export const BUYER_PROTECTION_LABELS: Record<BuyerProtectionState, string> = {
  PAYMENT_PROTECTED: "Оплата защищена",
  SELLER_PROCESSING: "Продавец готовит заказ",
  DELIVERY_PENDING: "Доставка",
  BUYER_CONFIRMATION: "Подтвердите получение",
  FUNDS_RELEASED: "Выплата продавцу",
  DISPUTE_OPEN: "Открыт спор",
};
