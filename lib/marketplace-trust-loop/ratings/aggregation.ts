import { OrderStatus, ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function recalculateProductRating(productId: string): Promise<void> {
  const reviews = await prisma.review.findMany({
    where: { productId, status: ReviewStatus.APPROVED },
    select: { rating: true },
  });

  const counts = [0, 0, 0, 0, 0, 0];
  for (const r of reviews) {
    counts[r.rating] = (counts[r.rating] ?? 0) + 1;
  }
  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = total > 0 ? sum / total : 0;

  await prisma.productRating.upsert({
    where: { productId },
    create: {
      productId,
      averageRating: average,
      reviewsCount: total,
      rating1: counts[1] ?? 0,
      rating2: counts[2] ?? 0,
      rating3: counts[3] ?? 0,
      rating4: counts[4] ?? 0,
      rating5: counts[5] ?? 0,
    },
    update: {
      averageRating: average,
      reviewsCount: total,
      rating1: counts[1] ?? 0,
      rating2: counts[2] ?? 0,
      rating3: counts[3] ?? 0,
      rating4: counts[4] ?? 0,
      rating5: counts[5] ?? 0,
    },
  });
}

export async function recalculateSellerReputation(sellerId: string): Promise<void> {
  const [reviews, completedOrders, cancelledOrders] = await Promise.all([
    prisma.review.findMany({
      where: { sellerId, status: ReviewStatus.APPROVED },
      select: { rating: true, pros: true },
    }),
    prisma.order.count({
      where: {
        status: OrderStatus.COMPLETED,
        items: { some: { product: { sellerId } } },
      },
    }),
    prisma.order.count({
      where: {
        status: OrderStatus.CANCELLED,
        items: { some: { product: { sellerId } } },
      },
    }),
  ]);

  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = total > 0 ? sum / total : 0;
  const orderTotal = completedOrders + cancelledOrders;
  const cancellationRate =
    orderTotal > 0 ? (cancelledOrders / orderTotal) * 100 : 0;
  const positiveSentiment = reviews.filter((r) => r.rating >= 4).length;

  let trustScore = 50;
  if (average >= 4.5) trustScore += 25;
  else if (average >= 4) trustScore += 15;
  else if (average >= 3) trustScore += 5;
  if (completedOrders >= 10) trustScore += 10;
  if (cancellationRate < 5) trustScore += 10;
  trustScore = Math.min(100, Math.max(0, trustScore));

  await prisma.sellerReputation.upsert({
    where: { sellerId },
    create: {
      sellerId,
      averageRating: average,
      reviewsCount: total,
      completedOrders,
      cancellationRate,
      trustScore,
      positiveSentiment,
    },
    update: {
      averageRating: average,
      reviewsCount: total,
      completedOrders,
      cancellationRate,
      trustScore,
      positiveSentiment,
    },
  });

  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { rating: average },
  });
}

export async function recalculateRatingsForReview(review: {
  productId: string;
  sellerId: string;
}): Promise<void> {
  await Promise.all([
    recalculateProductRating(review.productId),
    recalculateSellerReputation(review.sellerId),
  ]);
}
