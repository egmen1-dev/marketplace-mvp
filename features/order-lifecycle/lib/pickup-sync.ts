import {
  OrderActorRole,
  OrderStatus,
  PickupReservationStatus,
} from "@prisma/client";

import { notifyReservationCancelled } from "@/features/chat/queries";
import { notifyReservationCompleted } from "@/features/chat/queries";
import { notifyReservationConfirmed } from "@/features/chat/queries";
import { notifyReservationReady } from "@/features/chat/queries";
import { normalizeOrderStatus } from "@/features/order-lifecycle/lib/state-machine";
import { transitionOrderWithEffects } from "@/features/order-lifecycle/lib/transition";
import { prisma } from "@/lib/prisma";

const ORDER_TO_RESERVATION: Partial<
  Record<OrderStatus, PickupReservationStatus>
> = {
  [OrderStatus.CONFIRMED]: PickupReservationStatus.CONFIRMED,
  [OrderStatus.PROCESSING]: PickupReservationStatus.CONFIRMED,
  [OrderStatus.READY_FOR_PICKUP]: PickupReservationStatus.READY,
  [OrderStatus.PICKED_UP]: PickupReservationStatus.COMPLETED,
  [OrderStatus.COMPLETED]: PickupReservationStatus.COMPLETED,
  [OrderStatus.CANCELLED]: PickupReservationStatus.CANCELLED,
  [OrderStatus.REJECTED]: PickupReservationStatus.CANCELLED,
};

const RESERVATION_TO_ORDER: Partial<
  Record<PickupReservationStatus, OrderStatus>
> = {
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

/**
 * Advance a seller-pickup order along the happy path until `target` (inclusive).
 */
export async function advancePickupOrderToward(opts: {
  orderId: string;
  target: OrderStatus;
  actorRole: OrderActorRole;
  actorUserId?: string | null;
  reason?: string;
}): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    select: { status: true, fulfillmentType: true },
  });
  if (!order || order.fulfillmentType !== "SELLER_PICKUP") return;

  if (opts.target === OrderStatus.CANCELLED) {
    await transitionOrderWithEffects({
      orderId: opts.orderId,
      toStatus: OrderStatus.CANCELLED,
      actorRole: opts.actorRole,
      actorUserId: opts.actorUserId,
      reason: opts.reason,
      silent: true,
    }).catch(() => undefined);
    return;
  }

  let current = normalizeOrderStatus(order.status);

  // Unpaid NEW pickup → CONFIRMED directly (allowed on pickup branch).
  if (current === OrderStatus.NEW || current === OrderStatus.PAID) {
    if (current === OrderStatus.PAID) {
      current = OrderStatus.AWAITING_SELLER_CONFIRMATION;
    }
  }
  if (
    current === OrderStatus.NEW ||
    current === OrderStatus.AWAITING_SELLER_CONFIRMATION
  ) {
    await transitionOrderWithEffects({
      orderId: opts.orderId,
      toStatus: OrderStatus.CONFIRMED,
      actorRole: opts.actorRole,
      actorUserId: opts.actorUserId,
      reason: opts.reason ?? "Самовывоз подтверждён",
      silent: true,
    }).catch(() => undefined);
    current = OrderStatus.CONFIRMED;
  }

  const targetIdx = PICKUP_FORWARD.indexOf(opts.target);
  if (targetIdx < 0) return;

  let guard = 0;
  while (normalizeOrderStatus(current) !== opts.target && guard < 8) {
    guard += 1;
    const idx = PICKUP_FORWARD.indexOf(normalizeOrderStatus(current));
    if (idx < 0 || idx >= targetIdx) break;
    const next = PICKUP_FORWARD[idx + 1];
    if (!next) break;
    await transitionOrderWithEffects({
      orderId: opts.orderId,
      toStatus: next,
      actorRole: opts.actorRole,
      actorUserId: opts.actorUserId,
      reason: opts.reason,
      silent: true,
    }).catch(() => undefined);
    const refreshed = await prisma.order.findUnique({
      where: { id: opts.orderId },
      select: { status: true },
    });
    if (!refreshed) break;
    current = refreshed.status;
  }
}

/**
 * When OMS advances a seller-pickup order, mirror onto PickupReservation rows.
 */
export async function syncReservationsWithOrderStatus(opts: {
  orderId: string;
  orderStatus: OrderStatus;
  sellerId?: string;
}): Promise<void> {
  const target =
    ORDER_TO_RESERVATION[normalizeOrderStatus(opts.orderStatus)];
  if (!target) return;

  const rows = await prisma.pickupReservation.findMany({
    where: {
      orderId: opts.orderId,
      ...(opts.sellerId ? { sellerId: opts.sellerId } : {}),
      status: { notIn: [PickupReservationStatus.CANCELLED] },
    },
  });

  for (const row of rows) {
    if (row.status === target) continue;
    if (
      row.status === PickupReservationStatus.COMPLETED &&
      target !== PickupReservationStatus.CANCELLED
    ) {
      continue;
    }
    await prisma.pickupReservation.update({
      where: { id: row.id },
      data: { status: target },
    });
    try {
      if (target === PickupReservationStatus.CONFIRMED) {
        await notifyReservationConfirmed({ reservationId: row.id });
      } else if (target === PickupReservationStatus.READY) {
        await notifyReservationReady({ reservationId: row.id });
      } else if (target === PickupReservationStatus.COMPLETED) {
        await notifyReservationCompleted({ reservationId: row.id });
      } else if (target === PickupReservationStatus.CANCELLED) {
        await notifyReservationCancelled({ reservationId: row.id });
      }
    } catch (err) {
      console.error("[syncReservationsWithOrderStatus] notify", err);
    }
  }
}

export function mapReservationStatusToOrderStatus(
  status: PickupReservationStatus,
): OrderStatus | null {
  return RESERVATION_TO_ORDER[status] ?? null;
}
