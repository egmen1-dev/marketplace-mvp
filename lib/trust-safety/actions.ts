"use server";

import { DisputeReason, DisputeStatus } from "@prisma/client";

import { getSessionUser } from "@/features/auth";
import { buyerConfirmReceivedAction } from "@/features/order-lifecycle/actions";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import {
  canBuyerOpenDispute,
  canTransitionDispute,
  createDispute,
  isTrustSafetyEnabled,
} from "@/lib/trust-safety";
import { prisma } from "@/lib/prisma";

export async function createDisputeAction(input: {
  orderId: string;
  reason: DisputeReason;
  description?: string;
}): Promise<{ ok: boolean; error?: string; disputeId?: string }> {
  if (!isTrustSafetyEnabled()) {
    return { ok: false, error: "Trust & Safety выключен" };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Войдите в аккаунт" };

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: user.id },
    include: {
      disputes: {
        where: {
          status: {
            in: [
              DisputeStatus.OPEN,
              DisputeStatus.SELLER_RESPONSE,
              DisputeStatus.UNDER_REVIEW,
            ],
          },
        },
        take: 1,
      },
    },
  });
  if (!order) return { ok: false, error: "Заказ не найден" };

  if (
    !canBuyerOpenDispute({
      orderStatus: order.status,
      hasOpenDispute: order.disputes.length > 0,
      isBuyer: true,
    })
  ) {
    return { ok: false, error: "Спор сейчас недоступен" };
  }

  const result = await createDispute({
    orderId: input.orderId,
    buyerUserId: user.id,
    reason: input.reason,
    description: input.description,
  });

  if (result.ok) {
    void trackServerEvent({
      event: ANALYTICS_EVENTS.DISPUTE_CREATED,
      route: `/account/orders/${input.orderId}`,
      entityId: result.disputeId,
    });
  }

  return result;
}

/** Thin wrapper — confirm uses existing OMS action (funds release on COMPLETED). */
export async function buyerConfirmWithTrustAction(orderId: string) {
  const res = await buyerConfirmReceivedAction(orderId);
  if (res.ok) {
    void trackServerEvent({
      event: ANALYTICS_EVENTS.BUYER_CONFIRMATION,
      route: `/account/orders/${orderId}`,
      entityId: orderId,
    });
  }
  return res;
}

export async function adminResolveDisputeAction(input: {
  disputeId: string;
  toStatus: "RESOLVED_BUYER" | "RESOLVED_SELLER";
  resolution?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isTrustSafetyEnabled()) {
    return { ok: false, error: "Trust & Safety выключен" };
  }
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return { ok: false, error: "Недостаточно прав" };
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: input.disputeId },
  });
  if (!dispute) return { ok: false, error: "Спор не найден" };
  if (!canTransitionDispute(dispute.status, input.toStatus)) {
    return { ok: false, error: "Недопустимый переход статуса" };
  }

  await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      status: input.toStatus,
      resolution: input.resolution?.slice(0, 2000) ?? null,
      resolvedAt: new Date(),
    },
  });

  void trackServerEvent({
    event: ANALYTICS_EVENTS.DISPUTE_RESOLVED,
    route: "/admin/trust",
    entityId: dispute.id,
  });

  return { ok: true };
}
