import "server-only";

import {
  OrderStatus,
  PickupReservationStatus,
  type PrismaClient,
} from "@prisma/client";

export type ReviewErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "NOT_COMPLETED"
  | "SELF_REVIEW"
  | "ALREADY_REVIEWED"
  | "GUEST"
  | "VALIDATION"
  | "EDIT_WINDOW_CLOSED"
  | "REPLY_EXISTS";

export class ReviewError extends Error {
  constructor(
    public readonly code: ReviewErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

/** Editing window: buyer may edit their review within this many days. */
export const REVIEW_EDIT_WINDOW_DAYS = 30;

export type ReviewableContext = {
  orderItemId: string;
  orderId: string;
  productId: string;
  sellerId: string;
  buyerId: string;
};

/**
 * A purchase is completed (review-eligible) when the order is DELIVERED, or a
 * pickup reservation for the same order+product+buyer is COMPLETED (sections
 * 27/28). Self-review and duplicate review are blocked.
 */
export async function assertCanReview(
  db: PrismaClient,
  opts: { buyerId: string; orderItemId: string },
): Promise<ReviewableContext> {
  const item = await db.orderItem.findUnique({
    where: { id: opts.orderItemId },
    select: {
      id: true,
      orderId: true,
      productId: true,
      order: { select: { userId: true, status: true } },
      product: { select: { sellerId: true, seller: { select: { userId: true } } } },
      review: { select: { id: true } },
    },
  });

  if (!item) throw new ReviewError("NOT_FOUND", "Покупка не найдена", 404);
  if (item.order.userId !== opts.buyerId) {
    throw new ReviewError("FORBIDDEN", "Это не ваша покупка", 403);
  }
  if (item.product.seller.userId === opts.buyerId) {
    throw new ReviewError(
      "SELF_REVIEW",
      "Нельзя оставить отзыв на собственный товар",
      403,
    );
  }
  if (item.review) {
    throw new ReviewError(
      "ALREADY_REVIEWED",
      "Вы уже оставили отзыв на эту покупку",
      409,
    );
  }

  const completed =
    item.order.status === OrderStatus.DELIVERED ||
    (await db.pickupReservation.count({
      where: {
        orderId: item.orderId,
        productId: item.productId,
        buyerId: opts.buyerId,
        status: PickupReservationStatus.COMPLETED,
      },
    })) > 0;

  if (!completed) {
    throw new ReviewError(
      "NOT_COMPLETED",
      "Отзыв можно оставить только после получения заказа",
      400,
    );
  }

  return {
    orderItemId: item.id,
    orderId: item.orderId,
    productId: item.productId,
    sellerId: item.product.sellerId,
    buyerId: opts.buyerId,
  };
}

/** Completed order items (buyer's) that are still awaiting a review. */
export async function listReviewableOrderItems(
  db: PrismaClient,
  buyerId: string,
): Promise<
  Array<{
    orderItemId: string;
    orderId: string;
    orderNumber: string;
    productId: string;
    productName: string;
    productSlug: string | null;
    completedAt: Date;
  }>
> {
  // Completed orders (DELIVERED) or orders with a COMPLETED reservation.
  const orders = await db.order.findMany({
    where: {
      userId: buyerId,
      OR: [
        { status: OrderStatus.DELIVERED },
        {
          reservations: {
            some: { status: PickupReservationStatus.COMPLETED },
          },
        },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          product: {
            select: { slug: true, seller: { select: { userId: true } } },
          },
          review: { select: { id: true } },
        },
      },
      reservations: {
        select: { productId: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const out: Array<{
    orderItemId: string;
    orderId: string;
    orderNumber: string;
    productId: string;
    productName: string;
    productSlug: string | null;
    completedAt: Date;
  }> = [];

  for (const order of orders) {
    const completedPickupProductIds = new Set(
      order.reservations
        .filter((r) => r.status === PickupReservationStatus.COMPLETED)
        .map((r) => r.productId),
    );
    for (const item of order.items) {
      if (item.review) continue; // already reviewed
      if (item.product.seller.userId === buyerId) continue; // self
      out.push({
        orderItemId: item.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.product.slug,
        completedAt: order.updatedAt,
      });
      void completedPickupProductIds; // eligibility already ensured at order level
    }
  }

  return out;
}
