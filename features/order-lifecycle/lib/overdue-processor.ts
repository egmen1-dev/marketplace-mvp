import { OrderEventType, Prisma } from "@prisma/client";

import {
  DEADLINE_LABELS,
  detectBreachedDeadline,
  type DeadlineType,
} from "@/features/order-lifecycle/lib/deadlines";
import { dispatchOrderNotification } from "@/features/notifications/order-notifications";
import { prisma } from "@/lib/prisma";

export type OverdueProcessResult = {
  scanned: number;
  marked: number;
  skipped: number;
  orderIds: string[];
};

/**
 * Idempotent overdue scanner. Marks isOverdue once; one OVERDUE_MARKED event.
 * Does not change Order.status.
 */
export async function processOverdueOrders(opts?: {
  now?: Date;
  limit?: number;
}): Promise<OverdueProcessResult> {
  const now = opts?.now ?? new Date();
  const limit = Math.min(500, Math.max(1, opts?.limit ?? 100));

  const candidates = await prisma.order.findMany({
    where: {
      isOverdue: false,
      status: {
        notIn: [
          "COMPLETED",
          "CANCELLED",
          "REJECTED",
          "REFUNDED",
          "RETURNED",
        ],
      },
      OR: [
        { confirmationDeadline: { lt: now } },
        { processingDeadline: { lt: now } },
        { shipmentDeadline: { lt: now } },
        { pickupExpiresAt: { lt: now } },
      ],
    },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      status: true,
      confirmationDeadline: true,
      processingDeadline: true,
      shipmentDeadline: true,
      pickupExpiresAt: true,
      isOverdue: true,
      items: {
        take: 1,
        select: {
          product: {
            select: { seller: { select: { userId: true } } },
          },
        },
      },
    },
  });

  let marked = 0;
  let skipped = 0;
  const orderIds: string[] = [];

  for (const order of candidates) {
    const breach = detectBreachedDeadline(order, now);
    if (!breach) {
      skipped += 1;
      continue;
    }

    const applied = await markOrderOverdueOnce({
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerUserId: order.userId,
      sellerUserId: order.items[0]?.product.seller.userId ?? null,
      deadlineType: breach.type,
      deadline: breach.deadline,
      status: order.status,
      now,
    });

    if (applied) {
      marked += 1;
      orderIds.push(order.id);
    } else {
      skipped += 1;
    }
  }

  return {
    scanned: candidates.length,
    marked,
    skipped,
    orderIds,
  };
}

/**
 * Mark a single order overdue at most once (idempotent under concurrency).
 */
export async function markOrderOverdueOnce(opts: {
  orderId: string;
  orderNumber: string;
  buyerUserId: string;
  sellerUserId: string | null;
  deadlineType: DeadlineType;
  deadline: Date;
  status: string;
  now?: Date;
}): Promise<boolean> {
  const now = opts.now ?? new Date();

  const updated = await prisma.order.updateMany({
    where: { id: opts.orderId, isOverdue: false },
    data: {
      isOverdue: true,
      overdueAt: now,
      overdueReason: opts.deadlineType,
    },
  });

  if (updated.count === 0) {
    return false;
  }

  const existing = await prisma.orderEvent.findFirst({
    where: {
      orderId: opts.orderId,
      type: OrderEventType.OVERDUE_MARKED,
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.orderEvent.create({
      data: {
        orderId: opts.orderId,
        type: OrderEventType.OVERDUE_MARKED,
        payload: {
          deadlineType: opts.deadlineType,
          deadline: opts.deadline.toISOString(),
          status: opts.status,
        } satisfies Prisma.InputJsonValue,
      },
    });
  }

  const sellerId = opts.sellerUserId;
  if (sellerId) {
    await dispatchOrderNotification({
      orderId: opts.orderId,
      orderNumber: opts.orderNumber,
      userId: sellerId,
      title: `Заказ ${opts.orderNumber} требует внимания`,
      body: `Просрочен дедлайн: ${DEADLINE_LABELS[opts.deadlineType]}`,
      channels: ["in_app"],
    }).catch(() => undefined);
  }

  return true;
}
