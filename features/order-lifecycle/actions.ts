"use server";

import { OrderActorRole, OrderStatus } from "@prisma/client";

import { requireUserSession } from "@/features/auth";
import {
  OrderLifecycleError,
  transitionOrderWithEffects,
} from "@/features/order-lifecycle/lib/transition";
import { prisma } from "@/lib/prisma";

export type LifecycleActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function assertBuyerOwnsOrder(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true },
  });
  if (!order) {
    throw new OrderLifecycleError("FORBIDDEN", "Нет доступа к заказу", 403);
  }
}

export async function buyerCancelOrderAction(
  orderId: string,
): Promise<LifecycleActionResult> {
  try {
    const user = await requireUserSession();
    await assertBuyerOwnsOrder(orderId, user.id);
    await transitionOrderWithEffects({
      orderId,
      toStatus: OrderStatus.CANCELLED,
      actorUserId: user.id,
      actorRole: OrderActorRole.BUYER,
      reason: "Отмена покупателем",
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof OrderLifecycleError) {
      return { ok: false, error: err.message };
    }
    console.error("[buyerCancelOrderAction]", err);
    return { ok: false, error: "Не удалось отменить заказ" };
  }
}

export async function buyerConfirmReceivedAction(
  orderId: string,
): Promise<LifecycleActionResult> {
  try {
    const user = await requireUserSession();
    await assertBuyerOwnsOrder(orderId, user.id);
    const { confirmBuyerOrder } = await import("@/lib/trust/confirmation");
    await confirmBuyerOrder(orderId, user.id);
    return { ok: true };
  } catch (err) {
    if (err instanceof OrderLifecycleError) {
      return { ok: false, error: err.message };
    }
    const { TrustError } = await import("@/lib/trust/errors");
    if (err instanceof TrustError) {
      return { ok: false, error: err.message };
    }
    console.error("[buyerConfirmReceivedAction]", err);
    return { ok: false, error: "Не удалось подтвердить получение" };
  }
}

export async function buyerRequestReturnAction(
  orderId: string,
): Promise<LifecycleActionResult> {
  try {
    const user = await requireUserSession();
    await assertBuyerOwnsOrder(orderId, user.id);
    await transitionOrderWithEffects({
      orderId,
      toStatus: OrderStatus.RETURN_REQUESTED,
      actorUserId: user.id,
      actorRole: OrderActorRole.BUYER,
      reason: "Запрос возврата",
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof OrderLifecycleError) {
      return { ok: false, error: err.message };
    }
    console.error("[buyerRequestReturnAction]", err);
    return { ok: false, error: "Не удалось создать запрос на возврат" };
  }
}
