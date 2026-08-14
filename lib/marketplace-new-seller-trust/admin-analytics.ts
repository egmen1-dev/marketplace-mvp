import { OrderStatus, ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { AdminNewSellerStats } from "./types";

const COMPLETED: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
];

export async function getAdminNewSellerStats(): Promise<AdminNewSellerStats> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const newSellersToday = await prisma.sellerProfile.findMany({
    where: { createdAt: { gte: startOfToday } },
    select: { id: true, isVerified: true, phone: true },
  });

  const sellerIds = newSellersToday.map((s) => s.id);
  if (sellerIds.length === 0) {
    return {
      todayCount: 0,
      verifiedCount: 0,
      firstOrderCount: 0,
      firstReviewCount: 0,
    };
  }

  const [paymentMethods, completedItems, reviews] = await Promise.all([
    prisma.sellerPaymentMethod.findMany({
      where: { sellerId: { in: sellerIds } },
      select: { sellerId: true },
    }),
    prisma.orderItem.findMany({
      where: {
        product: { sellerId: { in: sellerIds } },
        order: { status: { in: COMPLETED } },
      },
      select: { product: { select: { sellerId: true } } },
      take: 500,
    }),
    prisma.review.findMany({
      where: { sellerId: { in: sellerIds }, status: ReviewStatus.APPROVED },
      select: { sellerId: true },
    }),
  ]);

  const sellersWithPayment = new Set(paymentMethods.map((p) => p.sellerId));
  const sellersWithOrder = new Set(completedItems.map((i) => i.product.sellerId));
  const sellersWithReview = new Set(reviews.map((r) => r.sellerId));

  const verifiedCount = newSellersToday.filter(
    (s) => s.isVerified || Boolean(s.phone?.trim()) || sellersWithPayment.has(s.id),
  ).length;

  return {
    todayCount: newSellersToday.length,
    verifiedCount,
    firstOrderCount: sellersWithOrder.size,
    firstReviewCount: sellersWithReview.size,
  };
}
