import { OrderStatus } from "@prisma/client";

import { normalizeOrderStatus } from "@/features/order-lifecycle/lib/state-machine";
import { prisma } from "@/lib/prisma";

/** Official completed statuses for ranking / sales / buyout. */
export const COMPLETED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  // Legacy / mid-migration: delivered counts until buyer confirms COMPLETED
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
];

export function isCompletedForRanking(status: OrderStatus): boolean {
  const s = normalizeOrderStatus(status);
  return (
    s === OrderStatus.COMPLETED ||
    s === OrderStatus.DELIVERED ||
    s === OrderStatus.PICKED_UP
  );
}

/** Reviews may attach once COMPLETED (or reviewEligibleAt set). */
export function isOrderReviewEligible(order: {
  status: OrderStatus;
  reviewEligibleAt: Date | null;
}): boolean {
  return (
    order.reviewEligibleAt != null ||
    normalizeOrderStatus(order.status) === OrderStatus.COMPLETED
  );
}

export async function countCompletedOrdersForSeller(
  sellerProfileId: string,
): Promise<{ completedOrdersCount: number; salesCount: number }> {
  const orderItems = await prisma.orderItem.findMany({
    where: {
      product: { sellerId: sellerProfileId },
      order: { status: { in: COMPLETED_ORDER_STATUSES } },
    },
    select: { quantity: true, orderId: true },
  });
  const orderIds = new Set(orderItems.map((i) => i.orderId));
  return {
    completedOrdersCount: orderIds.size,
    salesCount: orderItems.reduce((sum, i) => sum + i.quantity, 0),
  };
}

export type OrderLifecycleAnalytics = {
  ordersCompleted: number;
  averageConfirmationMs: number | null;
  averageProcessingMs: number | null;
  averageDeliveryMs: number | null;
};

/**
 * Aggregate OMS timings from immutable history (no heavy joins).
 */
export async function getOrderLifecycleAnalytics(opts?: {
  sellerProfileId?: string;
  from?: Date;
  to?: Date;
}): Promise<OrderLifecycleAnalytics> {
  const completedWhere = {
    status: OrderStatus.COMPLETED,
    ...(opts?.from || opts?.to
      ? {
          completedAt: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
    ...(opts?.sellerProfileId
      ? {
          items: {
            some: { product: { sellerId: opts.sellerProfileId } },
          },
        }
      : {}),
  };

  const ordersCompleted = await prisma.order.count({ where: completedWhere });

  const histories = await prisma.orderStatusHistory.findMany({
    where: {
      order: completedWhere,
      toStatus: {
        in: [
          OrderStatus.CONFIRMED,
          OrderStatus.PROCESSING,
          OrderStatus.DELIVERED,
          OrderStatus.COMPLETED,
          OrderStatus.PICKED_UP,
        ],
      },
    },
    select: {
      orderId: true,
      toStatus: true,
      createdAt: true,
      order: { select: { createdAt: true } },
    },
    take: 5000,
  });

  const byOrder = new Map<
    string,
    { createdAt: Date; confirmed?: Date; processing?: Date; delivered?: Date }
  >();

  for (const row of histories) {
    let bucket = byOrder.get(row.orderId);
    if (!bucket) {
      bucket = { createdAt: row.order.createdAt };
      byOrder.set(row.orderId, bucket);
    }
    if (row.toStatus === OrderStatus.CONFIRMED) bucket.confirmed = row.createdAt;
    if (row.toStatus === OrderStatus.PROCESSING) {
      bucket.processing = row.createdAt;
    }
    if (
      row.toStatus === OrderStatus.DELIVERED ||
      row.toStatus === OrderStatus.PICKED_UP ||
      row.toStatus === OrderStatus.COMPLETED
    ) {
      bucket.delivered = row.createdAt;
    }
  }

  const conf: number[] = [];
  const proc: number[] = [];
  const del: number[] = [];

  for (const b of byOrder.values()) {
    if (b.confirmed) conf.push(b.confirmed.getTime() - b.createdAt.getTime());
    if (b.processing && b.confirmed) {
      proc.push(b.processing.getTime() - b.confirmed.getTime());
    }
    if (b.delivered) del.push(b.delivered.getTime() - b.createdAt.getTime());
  }

  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

  return {
    ordersCompleted,
    averageConfirmationMs: avg(conf),
    averageProcessingMs: avg(proc),
    averageDeliveryMs: avg(del),
  };
}
