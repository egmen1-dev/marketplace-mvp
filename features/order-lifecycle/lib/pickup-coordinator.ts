import {
  OrderActorRole,
  OrderStatus,
  PickupReservationStatus,
} from "@prisma/client";

import {
  afterTransitionSideEffects,
  transitionOrderInTx,
  type TransitionOrderResult,
} from "@/features/order-lifecycle/lib/transition";
import { normalizeOrderStatus } from "@/features/order-lifecycle/lib/state-machine";
import { prisma } from "@/lib/prisma";
import {
  notifyReservationCancelled,
  notifyReservationCompleted,
  notifyReservationConfirmed,
  notifyReservationReady,
} from "@/features/chat/queries";

/**
 * Reservation ↔ Order status mapping (pickup branch).
 *
 * PENDING     → AWAITING_SELLER_CONFIRMATION | NEW | CONFIRMED (pre-confirm)
 * CONFIRMED   → CONFIRMED (+ PROCESSING when advancing further)
 * READY       → READY_FOR_PICKUP
 * COMPLETED   → PICKED_UP then COMPLETED
 * CANCELLED   → CANCELLED | REJECTED
 */
export const RESERVATION_TO_ORDER_TARGET: Record<
  PickupReservationStatus,
  OrderStatus | null
> = {
  [PickupReservationStatus.PENDING]: null,
  [PickupReservationStatus.CONFIRMED]: OrderStatus.CONFIRMED,
  [PickupReservationStatus.READY]: OrderStatus.READY_FOR_PICKUP,
  [PickupReservationStatus.COMPLETED]: OrderStatus.COMPLETED,
  [PickupReservationStatus.CANCELLED]: OrderStatus.CANCELLED,
};

const PICKUP_FORWARD: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.COMPLETED,
];

const SELLER_RESERVATION_TRANSITIONS: Record<
  PickupReservationStatus,
  PickupReservationStatus[]
> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export class PickupCoordinatorError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "PickupCoordinatorError";
  }
}

export type CoordinatedPickupResult = {
  reservationId: string;
  reservationStatus: PickupReservationStatus;
  orderId: string;
  orderStatus: OrderStatus;
  orderTransitions: TransitionOrderResult[];
};

/**
 * Atomically update PickupReservation + advance Order OMS in one transaction.
 * Chat/notify run AFTER commit.
 */
export async function transitionPickupReservationWithOrder(opts: {
  reservationId: string;
  sellerId: string;
  toReservationStatus: PickupReservationStatus;
  actorUserId?: string | null;
  /** Seller reject uses REJECTED on order when cancelling from PENDING. */
  reject?: boolean;
}): Promise<CoordinatedPickupResult> {
  const pre = await prisma.pickupReservation.findFirst({
    where: { id: opts.reservationId, sellerId: opts.sellerId },
    select: {
      id: true,
      status: true,
      orderId: true,
      order: {
        select: {
          id: true,
          status: true,
          orderNumber: true,
          userId: true,
          fulfillmentType: true,
        },
      },
    },
  });

  if (!pre) {
    throw new PickupCoordinatorError("NOT_FOUND", "Бронь не найдена", 404);
  }

  if (pre.status === opts.toReservationStatus) {
    return {
      reservationId: pre.id,
      reservationStatus: pre.status,
      orderId: pre.orderId,
      orderStatus: pre.order.status,
      orderTransitions: [],
    };
  }

  if (
    !(SELLER_RESERVATION_TRANSITIONS[pre.status] ?? []).includes(
      opts.toReservationStatus,
    )
  ) {
    throw new PickupCoordinatorError(
      "INVALID_TRANSITION",
      "Нельзя перевести бронь в этот статус",
      400,
    );
  }

  if (pre.order.fulfillmentType !== "SELLER_PICKUP") {
    throw new PickupCoordinatorError(
      "WRONG_FULFILLMENT",
      "Заказ не является самовывозом",
      400,
    );
  }

  const orderTarget =
    opts.toReservationStatus === PickupReservationStatus.CANCELLED &&
    pre.status === PickupReservationStatus.PENDING
      ? OrderStatus.REJECTED
      : opts.toReservationStatus === PickupReservationStatus.CANCELLED
        ? OrderStatus.CANCELLED
        : RESERVATION_TO_ORDER_TARGET[opts.toReservationStatus];

  const orderTransitions: TransitionOrderResult[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.pickupReservation.update({
      where: { id: pre.id },
      data: { status: opts.toReservationStatus },
    });

    if (!orderTarget) return;

    let current = normalizeOrderStatus(
      (
        await tx.order.findUnique({
          where: { id: pre.orderId },
          select: { status: true },
        })
      )?.status ?? pre.order.status,
    );

    if (orderTarget === OrderStatus.CANCELLED || orderTarget === OrderStatus.REJECTED) {
      if (
        current !== OrderStatus.CANCELLED &&
        current !== OrderStatus.REJECTED
      ) {
        const r = await transitionOrderInTx(tx, {
          orderId: pre.orderId,
          toStatus: orderTarget,
          actorRole: OrderActorRole.SELLER,
          actorUserId: opts.actorUserId,
                  reason: pre.status === PickupReservationStatus.PENDING
                    ? "Отклонено продавцом"
                    : "Бронь отменена",
          silent: true,
        });
        if (!r.alreadyApplied) orderTransitions.push(r);
      }
      return;
    }

    // NEW / AWAITING → CONFIRMED first
    if (
      current === OrderStatus.NEW ||
      current === OrderStatus.AWAITING_SELLER_CONFIRMATION ||
      current === OrderStatus.PAID
    ) {
      const r = await transitionOrderInTx(tx, {
        orderId: pre.orderId,
        toStatus: OrderStatus.CONFIRMED,
        actorRole: OrderActorRole.SELLER,
        actorUserId: opts.actorUserId,
        reason: "Самовывоз подтверждён",
        silent: true,
      });
      if (!r.alreadyApplied) orderTransitions.push(r);
      current = OrderStatus.CONFIRMED;
    }

    const targetIdx = PICKUP_FORWARD.indexOf(orderTarget);
    let guard = 0;
    while (
      normalizeOrderStatus(current) !== orderTarget &&
      guard < 8 &&
      targetIdx >= 0
    ) {
      guard += 1;
      const idx = PICKUP_FORWARD.indexOf(normalizeOrderStatus(current));
      if (idx < 0 || idx >= targetIdx) break;
      const next = PICKUP_FORWARD[idx + 1];
      if (!next) break;
      // Buyer normally confirms COMPLETED; seller "Выдано" uses SYSTEM for the last hop.
      const actorRole =
        next === OrderStatus.COMPLETED
          ? OrderActorRole.SYSTEM
          : OrderActorRole.SELLER;
      const r = await transitionOrderInTx(tx, {
        orderId: pre.orderId,
        toStatus: next,
        actorRole,
        actorUserId: opts.actorUserId,
        reason: `Бронь → ${opts.toReservationStatus}`,
        silent: true,
      });
      if (r.alreadyApplied) break;
      orderTransitions.push(r);
      current = r.status;
    }
  });

  // Side effects after commit
  try {
    if (opts.toReservationStatus === "CONFIRMED") {
      await notifyReservationConfirmed({ reservationId: pre.id });
    } else if (opts.toReservationStatus === "READY") {
      await notifyReservationReady({ reservationId: pre.id });
    } else if (opts.toReservationStatus === "COMPLETED") {
      await notifyReservationCompleted({ reservationId: pre.id });
    } else if (opts.toReservationStatus === "CANCELLED") {
      await notifyReservationCancelled({ reservationId: pre.id });
    }
  } catch (err) {
    console.error("[pickup-coordinator] reservation notify", err);
  }

  for (const tr of orderTransitions) {
    try {
      await afterTransitionSideEffects({
        orderId: pre.orderId,
        orderNumber: pre.order.orderNumber,
        buyerUserId: pre.order.userId,
        fulfillmentType: "SELLER_PICKUP",
        previousStatus: tr.previousStatus,
        status: tr.status,
        actorRole: OrderActorRole.SELLER,
        actorUserId: opts.actorUserId ?? null,
        reason: tr.status,
        silent: false,
      });
    } catch (err) {
      console.error("[pickup-coordinator] order side-effect", err);
    }
  }

  const refreshed = await prisma.order.findUniqueOrThrow({
    where: { id: pre.orderId },
    select: { status: true },
  });

  return {
    reservationId: pre.id,
    reservationStatus: opts.toReservationStatus,
    orderId: pre.orderId,
    orderStatus: refreshed.status,
    orderTransitions,
  };
}

/** Buyer cancel while PENDING — reservation + order CANCELLED atomically. */
export async function cancelPickupReservationByBuyer(opts: {
  reservationId: string;
  buyerId: string;
}): Promise<CoordinatedPickupResult> {
  const pre = await prisma.pickupReservation.findFirst({
    where: { id: opts.reservationId, buyerId: opts.buyerId },
    select: {
      id: true,
      status: true,
      orderId: true,
      order: {
        select: {
          id: true,
          status: true,
          orderNumber: true,
          userId: true,
          fulfillmentType: true,
        },
      },
    },
  });
  if (!pre) {
    throw new PickupCoordinatorError("NOT_FOUND", "Бронь не найдена", 404);
  }
  if (pre.status !== PickupReservationStatus.PENDING) {
    throw new PickupCoordinatorError(
      "INVALID_TRANSITION",
      "Отменить можно только до подтверждения продавцом",
      400,
    );
  }

  const orderTransitions: TransitionOrderResult[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.pickupReservation.update({
      where: { id: pre.id },
      data: { status: PickupReservationStatus.CANCELLED },
    });
    if (
      pre.order.fulfillmentType === "SELLER_PICKUP" &&
      normalizeOrderStatus(pre.order.status) !== OrderStatus.CANCELLED
    ) {
      const r = await transitionOrderInTx(tx, {
        orderId: pre.orderId,
        toStatus: OrderStatus.CANCELLED,
        actorRole: OrderActorRole.BUYER,
        actorUserId: opts.buyerId,
        reason: "Отмена покупателем",
        silent: true,
      });
      if (!r.alreadyApplied) orderTransitions.push(r);
    }
  });

  try {
    await notifyReservationCancelled({ reservationId: pre.id });
  } catch (err) {
    console.error("[pickup-coordinator] buyer cancel notify", err);
  }

  for (const tr of orderTransitions) {
    try {
      await afterTransitionSideEffects({
        orderId: pre.orderId,
        orderNumber: pre.order.orderNumber,
        buyerUserId: pre.order.userId,
        fulfillmentType: "SELLER_PICKUP",
        previousStatus: tr.previousStatus,
        status: tr.status,
        actorRole: OrderActorRole.BUYER,
        actorUserId: opts.buyerId,
        reason: "Отмена покупателем",
      });
    } catch (err) {
      console.error("[pickup-coordinator] buyer cancel order notify", err);
    }
  }

  return {
    reservationId: pre.id,
    reservationStatus: PickupReservationStatus.CANCELLED,
    orderId: pre.orderId,
    orderStatus: OrderStatus.CANCELLED,
    orderTransitions,
  };
}
