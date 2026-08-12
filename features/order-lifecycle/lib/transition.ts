import {
  OrderActorRole,
  OrderEventType,
  OrderFulfillmentType,
  OrderStatus,
  Prisma,
} from "@prisma/client";

import { notifyOrderLifecycleMessage } from "@/features/chat/queries";
import {
  publishOrderLifecycleEvent,
} from "@/features/order-lifecycle/lib/event-bus";
import {
  chatMessageForTransition,
  eventTypeForStatus,
} from "@/features/order-lifecycle/lib/events";
import {
  canTransition,
  normalizeOrderStatus,
} from "@/features/order-lifecycle/lib/state-machine";
import { buildSlaAfterPayment } from "@/features/order-lifecycle/lib/sla";
import { dispatchOrderNotification } from "@/features/notifications/order-notifications";
import { prisma } from "@/lib/prisma";

export class OrderLifecycleError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_TRANSITION"
      | "CONFLICT",
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "OrderLifecycleError";
  }
}

export type TransitionOrderInput = {
  orderId: string;
  toStatus: OrderStatus;
  actorUserId?: string | null;
  actorRole: OrderActorRole;
  reason?: string | null;
  /** Skip chat side-effect (tests / batch). */
  silent?: boolean;
  /** Optional transaction client — when set, caller owns the commit. */
  tx?: Prisma.TransactionClient;
};

export type TransitionOrderResult = {
  orderId: string;
  previousStatus: OrderStatus;
  status: OrderStatus;
  historyId: string;
  eventId: string | null;
  /** True when status was already `toStatus` (safe retry). */
  alreadyApplied?: boolean;
};

/**
 * Sole mutation path for Order.status.
 * Writes immutable history + OrderEvent, publishes event bus, optional chat/notify.
 */
export async function transitionOrder(
  input: TransitionOrderInput,
): Promise<TransitionOrderResult> {
  if (input.tx) {
    return transitionOrderInTx(input.tx, input);
  }
  return prisma.$transaction((tx) => transitionOrderInTx(tx, input));
}

export async function transitionOrderInTx(
  tx: Prisma.TransactionClient,
  input: TransitionOrderInput,
): Promise<TransitionOrderResult> {
  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    include: {
      delivery: {
        select: { estimatedMaxDays: true },
      },
      items: {
        select: {
          product: { select: { sellerId: true, seller: { select: { userId: true } } } },
        },
      },
    },
  });

  if (!order) {
    throw new OrderLifecycleError("NOT_FOUND", "Заказ не найден", 404);
  }

  const fromStatus = order.status;
  const toStatus = input.toStatus;

  // Idempotent retry / double-click: already at target → no duplicate history.
  if (normalizeOrderStatus(fromStatus) === normalizeOrderStatus(toStatus)) {
    return {
      orderId: order.id,
      previousStatus: fromStatus,
      status: fromStatus,
      historyId: "",
      eventId: null,
      alreadyApplied: true,
    };
  }

  if (
    !canTransition({
      from: fromStatus,
      to: toStatus,
      fulfillmentType: order.fulfillmentType,
      actorRole: input.actorRole,
    })
  ) {
    throw new OrderLifecycleError(
      "INVALID_TRANSITION",
      `Нельзя сменить статус ${fromStatus} → ${toStatus}`,
      400,
    );
  }

  const now = new Date();
  const isComplete = toStatus === OrderStatus.COMPLETED;
  const paymentRecorded =
    toStatus === OrderStatus.AWAITING_SELLER_CONFIRMATION ||
    toStatus === OrderStatus.PAID;

  let slaPatch: Prisma.OrderUpdateInput = {};
  if (paymentRecorded) {
    const sla = buildSlaAfterPayment({
      now,
      handlingDays: order.handlingDays,
      fulfillmentType: order.fulfillmentType,
      deliveryEstimatedMaxDays: order.delivery?.estimatedMaxDays ?? null,
    });
    slaPatch = {
      confirmationDeadline: sla.confirmationDeadline,
      processingDeadline: sla.processingDeadline,
      shipmentDeadline: sla.shipmentDeadline,
      pickupExpiresAt: sla.pickupExpiresAt,
      estimatedDeliveryAt: sla.estimatedDeliveryAt,
      handlingDays: sla.handlingDays,
    };
  }

  if (toStatus === OrderStatus.READY_FOR_PICKUP && !order.pickupExpiresAt) {
    slaPatch = {
      ...slaPatch,
      pickupExpiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    };
  }

  await tx.order.update({
    where: { id: order.id },
    data: {
      status: toStatus,
      ...slaPatch,
      ...(isComplete
        ? {
            completedAt: now,
            reviewEligibleAt: now,
          }
        : {}),
    },
  });

  const history = await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus,
      toStatus,
      changedByUserId: input.actorUserId ?? null,
      performedByRole: input.actorRole,
      reason: input.reason ?? null,
      note: input.reason ?? null,
    },
  });

  const eventType = eventTypeForStatus(toStatus);
  let eventId: string | null = null;
  if (eventType) {
    const event = await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: eventType,
        payload: {
          fromStatus,
          toStatus,
          actorRole: input.actorRole,
          reason: input.reason ?? null,
        },
      },
    });
    eventId = event.id;
  }

  // Side effects after commit when not nested — schedule via Promise after return
  // when using outer tx the caller should invoke afterTransitionSideEffects.
  if (!input.tx) {
    // Transaction is about to commit; queue microtask after function returns.
  }

  const result: TransitionOrderResult = {
    orderId: order.id,
    previousStatus: fromStatus,
    status: toStatus,
    historyId: history.id,
    eventId,
  };

  // Run side-effects outside the DB write path but still awaited for consistency
  // when we own the transaction (prisma.$transaction already committed on resolve).
  return result;
}

/**
 * Chat + notifications + event bus. Call after successful transition commit.
 */
export async function afterTransitionSideEffects(opts: {
  orderId: string;
  orderNumber: string;
  buyerUserId: string;
  fulfillmentType: OrderFulfillmentType;
  previousStatus: OrderStatus;
  status: OrderStatus;
  actorRole: OrderActorRole;
  actorUserId: string | null;
  reason?: string | null;
  silent?: boolean;
  completedAt?: Date | null;
  reviewEligibleAt?: Date | null;
}): Promise<void> {
  const eventType = eventTypeForStatus(opts.status);

  if (eventType) {
    await publishOrderLifecycleEvent({
      orderId: opts.orderId,
      orderNumber: opts.orderNumber,
      type: eventType,
      previousStatus: opts.previousStatus,
      newStatus: opts.status,
      fulfillmentType: opts.fulfillmentType,
      actorRole: opts.actorRole,
      actorUserId: opts.actorUserId,
      completedAt: opts.completedAt ?? null,
      reviewEligibleAt: opts.reviewEligibleAt ?? null,
    });
  }

  if (opts.silent) return;

  const chatText = chatMessageForTransition({
    to: opts.status,
    orderNumber: opts.orderNumber,
    fulfillmentType: opts.fulfillmentType,
  });

  if (chatText) {
    try {
      await notifyOrderLifecycleMessage({
        orderId: opts.orderId,
        body: chatText,
      });
    } catch (err) {
      console.error("[order-lifecycle] chat notify", err);
    }
  }

  try {
    await dispatchOrderNotification({
      orderId: opts.orderId,
      orderNumber: opts.orderNumber,
      userId: opts.buyerUserId,
      title: `Заказ ${opts.orderNumber}`,
      body: chatText ?? `Статус: ${normalizeOrderStatus(opts.status)}`,
      channels: ["in_app"],
    });
  } catch (err) {
    console.error("[order-lifecycle] notification", err);
  }
}

/**
 * High-level transition: mutate + side effects. Preferred public API.
 */
export async function transitionOrderWithEffects(
  input: TransitionOrderInput,
): Promise<TransitionOrderResult> {
  const orderMeta = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      orderNumber: true,
      userId: true,
      fulfillmentType: true,
      completedAt: true,
      reviewEligibleAt: true,
    },
  });
  if (!orderMeta) {
    throw new OrderLifecycleError("NOT_FOUND", "Заказ не найден", 404);
  }

  const result = await transitionOrder(input);

  if (result.alreadyApplied) {
    return result;
  }

  const refreshed = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { completedAt: true, reviewEligibleAt: true },
  });

  await afterTransitionSideEffects({
    orderId: result.orderId,
    orderNumber: orderMeta.orderNumber,
    buyerUserId: orderMeta.userId,
    fulfillmentType: orderMeta.fulfillmentType,
    previousStatus: result.previousStatus,
    status: result.status,
    actorRole: input.actorRole,
    actorUserId: input.actorUserId ?? null,
    reason: input.reason,
    silent: input.silent,
    completedAt: refreshed?.completedAt ?? null,
    reviewEligibleAt: refreshed?.reviewEligibleAt ?? null,
  });

  return result;
}

/** Record CREATED event + history row for brand-new orders (status stays NEW). */
export async function recordOrderCreated(opts: {
  orderId: string;
  actorUserId?: string | null;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const db = opts.tx ?? prisma;
  await db.orderStatusHistory.create({
    data: {
      orderId: opts.orderId,
      fromStatus: null,
      toStatus: OrderStatus.NEW,
      changedByUserId: opts.actorUserId ?? null,
      performedByRole: OrderActorRole.BUYER,
      reason: "Заказ создан",
      note: "Заказ создан",
    },
  });
  await db.orderEvent.create({
    data: {
      orderId: opts.orderId,
      type: OrderEventType.CREATED,
      payload: { status: OrderStatus.NEW },
    },
  });
}

/** Mark overdue without changing primary status. */
export async function markOrderOverdue(orderId: string): Promise<void> {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { isOverdue: true, overdueAt: new Date() },
  });
  await prisma.orderEvent.create({
    data: {
      orderId,
      type: OrderEventType.OVERDUE_MARKED,
      payload: { status: order.status },
    },
  });
}
