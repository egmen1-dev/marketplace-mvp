import type { OrderStatus } from "@prisma/client";

import { isOpenDisputeStatus } from "./disputes";
import { isTrustSafetyEnabled } from "./flags";

export type TrustActor = "buyer" | "seller" | "admin" | "guest";

export function canViewTrustTimeline(
  actor: TrustActor,
  enabled = isTrustSafetyEnabled(),
): boolean {
  if (!enabled) return false;
  return actor === "buyer" || actor === "seller" || actor === "admin";
}

export function canBuyerConfirmReceipt(orderStatus: OrderStatus): boolean {
  return orderStatus === "DELIVERED" || orderStatus === "PICKED_UP";
}

export function canBuyerOpenDispute(input: {
  orderStatus: OrderStatus;
  hasOpenDispute: boolean;
  isBuyer: boolean;
}): boolean {
  if (!input.isBuyer || input.hasOpenDispute) return false;
  const ok: OrderStatus[] = [
    "DELIVERED",
    "PICKED_UP",
    "COMPLETED",
    "SHIPPED",
    "IN_TRANSIT",
    "ARRIVED",
    "READY_FOR_PICKUP",
  ];
  return ok.includes(input.orderStatus);
}

export function canAdminManageDisputes(actor: TrustActor): boolean {
  return actor === "admin";
}

export function canSellerRespondToDispute(
  actor: TrustActor,
  disputeStatus: string,
): boolean {
  return (
    actor === "seller" &&
    isOpenDisputeStatus(disputeStatus as "OPEN" | "UNDER_REVIEW")
  );
}
