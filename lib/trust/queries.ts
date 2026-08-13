import { OrderStatus } from "@prisma/client";

import { getActiveDisputeForOrder } from "@/lib/trust/dispute";
import { getBuyerConfirmation } from "@/lib/trust/confirmation";
import type {
  OrderTrustContext,
  SellerOrderTrustInfo,
} from "@/lib/trust/types";
import {
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_LABELS,
} from "@/lib/trust/types";
import { prisma } from "@/lib/prisma";

const BUYER_ACTION_STATUSES = new Set<OrderStatus>([
  OrderStatus.AWAITING_BUYER_CONFIRMATION,
  OrderStatus.PROTECTION_PERIOD,
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
]);

export async function getOrderTrustContext(
  orderId: string,
  buyerUserId: string,
): Promise<OrderTrustContext | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: buyerUserId },
    select: {
      id: true,
      status: true,
      protectionEndsAt: true,
    },
  });

  if (!order) return null;

  const [confirmation, activeDispute] = await Promise.all([
    getBuyerConfirmation(orderId),
    getActiveDisputeForOrder(orderId),
  ]);

  const hasOpenDispute =
    activeDispute?.status === "OPEN" ||
    activeDispute?.status === "UNDER_REVIEW" ||
    order.status === OrderStatus.DISPUTE_OPEN;

  return {
    orderId: order.id,
    orderStatus: order.status,
    protectionEndsAt: order.protectionEndsAt?.toISOString() ?? null,
    confirmation,
    activeDispute,
    canConfirm:
      BUYER_ACTION_STATUSES.has(order.status) &&
      !hasOpenDispute &&
      confirmation?.status !== "CONFIRMED",
    canReportIssue:
      BUYER_ACTION_STATUSES.has(order.status) &&
      !hasOpenDispute &&
      confirmation?.status !== "REPORTED_ISSUE",
  };
}

export async function getSellerOrderTrustInfo(
  orderId: string,
): Promise<SellerOrderTrustInfo> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, protectionEndsAt: true },
  });

  const dispute = await prisma.dispute.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { status: true, reason: true },
  });

  if (dispute && (dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW")) {
    return {
      protectionLabel: "Есть спор",
      disputeStatus: dispute.status,
      disputeReason: dispute.reason,
    };
  }

  if (
    order?.status === OrderStatus.AWAITING_BUYER_CONFIRMATION ||
    order?.status === OrderStatus.PROTECTION_PERIOD ||
    order?.status === OrderStatus.DISPUTE_OPEN
  ) {
    return {
      protectionLabel: "Заказ защищён",
      disputeStatus: dispute?.status ?? null,
      disputeReason: dispute?.reason ?? null,
    };
  }

  if (dispute?.status === "SELLER_WON" || dispute?.status === "BUYER_WON") {
    return {
      protectionLabel: DISPUTE_STATUS_LABELS[dispute.status],
      disputeStatus: dispute.status,
      disputeReason: dispute.reason,
    };
  }

  return {
    protectionLabel: null,
    disputeStatus: dispute?.status ?? null,
    disputeReason: dispute?.reason ?? null,
  };
}

export function formatDisputeReason(
  reason: keyof typeof DISPUTE_REASON_LABELS,
): string {
  return DISPUTE_REASON_LABELS[reason];
}
