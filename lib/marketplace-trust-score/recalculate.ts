import {
  OrderStatus,
  ProductStatus,
  ReviewStatus,
  TrustScoreEventType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  computeSellerTrustScore,
  type SellerMetricsInput,
} from "./calculator";
import { NEW_SELLER_TRUST_SCORE } from "./constants";
import {
  countSellerCancellations,
  getDailyTrustDeltaUsed,
  recordTrustScoreHistory,
} from "./history";
import { applyTrustDeltaCaps } from "./rules";
import type { TrustScoreEventContext } from "./types";

const COMPLETED_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
];

const CANCELLED_STATUSES: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REJECTED];

export async function gatherSellerMetrics(sellerId: string): Promise<SellerMetricsInput> {
  const [seller, products, reviews, orders, paymentMethods] = await Promise.all([
    prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: {
        isVerified: true,
        phone: true,
        user: { select: { phone: true } },
      },
    }),
    prisma.product.findMany({
      where: { sellerId, status: { in: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK] } },
      select: {
        description: true,
        updatedAt: true,
        images: { select: { isPrimary: true }, orderBy: { sortOrder: "asc" } },
        _count: { select: { characteristicValues: true } },
      },
    }),
    prisma.review.findMany({
      where: { sellerId, status: ReviewStatus.APPROVED },
      select: { rating: true, photos: { select: { id: true }, take: 1 } },
    }),
    prisma.order.findMany({
      where: { items: { some: { product: { sellerId } } } },
      select: {
        status: true,
        createdAt: true,
        completedAt: true,
        statusHistory: {
          where: { toStatus: OrderStatus.CONFIRMED },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true },
        },
        delivery: { select: { shippedAt: true } },
        disputes: { select: { id: true }, take: 1 },
        returnRequests: { select: { id: true }, take: 1 },
      },
    }),
    prisma.sellerPaymentMethod.count({ where: { sellerId } }),
  ]);

  if (!seller) {
    throw new Error(`Seller not found: ${sellerId}`);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const productRows = products.map((p) => ({
    imageCount: p.images.length,
    hasPrimary: p.images.some((i) => i.isPrimary) || p.images.length > 0,
    characteristicCount: p._count.characteristicValues,
    descriptionLength: (p.description ?? "").trim().length,
  }));

  const completedOrders = orders.filter((o) => COMPLETED_STATUSES.includes(o.status)).length;
  const cancelledBySeller = orders.filter((o) => CANCELLED_STATUSES.includes(o.status)).length;
  const problematicOrders = orders.filter(
    (o) => o.disputes.length > 0 || o.returnRequests.length > 0,
  ).length;

  const shippingHoursSamples: number[] = [];
  for (const order of orders) {
    const shippedAt = order.delivery?.shippedAt;
    const confirmedAt = order.statusHistory[0]?.createdAt ?? order.createdAt;
    if (!shippedAt) continue;
    const hours = (shippedAt.getTime() - confirmedAt.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) shippingHoursSamples.push(hours);
  }

  const reviewSum = reviews.reduce((acc, r) => acc + r.rating, 0);

  return {
    products: productRows,
    completedOrders,
    cancelledBySeller,
    problematicOrders,
    shippingHoursSamples,
    averageReviewRating: reviews.length > 0 ? reviewSum / reviews.length : 0,
    reviewsCount: reviews.length,
    activeProducts: products.filter((p) => p.images.length > 0).length,
    recentProductUpdates: products.filter((p) => p.updatedAt >= thirtyDaysAgo).length,
    phoneVerified: Boolean(seller.phone?.trim() || seller.user.phone?.trim()),
    paymentVerified: paymentMethods > 0,
    isVerified: seller.isVerified,
  };
}

export async function getCurrentSellerTrustScore(sellerId: string): Promise<number> {
  const rep = await prisma.sellerReputation.findUnique({
    where: { sellerId },
    select: { trustScore: true },
  });
  return rep?.trustScore && rep.trustScore > 0 ? rep.trustScore : NEW_SELLER_TRUST_SCORE;
}

export async function applyTrustScoreChange(input: {
  sellerId: string;
  targetScore: number;
  event: TrustScoreEventContext;
}): Promise<number> {
  const currentScore = await getCurrentSellerTrustScore(input.sellerId);
  const dailyDeltaUsed = await getDailyTrustDeltaUsed(input.sellerId);
  const rawDelta = input.event.rawDelta !== 0 ? input.event.rawDelta : input.targetScore - currentScore;

  const { newScore, appliedDelta } = applyTrustDeltaCaps({
    currentScore,
    rawDelta,
    dailyDeltaUsed,
  });

  if (appliedDelta !== 0) {
    await recordTrustScoreHistory({
      sellerId: input.sellerId,
      oldScore: currentScore,
      newScore,
      reason: input.event.reason,
      eventType: input.event.eventType,
    });
  }

  return newScore;
}

export async function recalculateSellerTrustScore(
  sellerId: string,
  eventType: TrustScoreEventType = TrustScoreEventType.DAILY_RECALC,
  eventContext?: Partial<TrustScoreEventContext>,
): Promise<number> {
  const metrics = await gatherSellerMetrics(sellerId);
  const computed = computeSellerTrustScore(metrics);
  const currentScore = await getCurrentSellerTrustScore(sellerId);

  const event: TrustScoreEventContext = {
    eventType,
    reason: eventContext?.reason ?? "Плановый пересчёт рейтинга доверия",
    rawDelta: eventContext?.rawDelta ?? computed.score - currentScore,
  };

  const newScore = await applyTrustScoreChange({
    sellerId,
    targetScore: computed.score,
    event,
  });

  return newScore;
}

export async function handleTrustScoreEvent(input: {
  sellerId: string;
  eventType: TrustScoreEventType;
  reason: string;
  rawDelta: number;
}): Promise<number> {
  const currentScore = await getCurrentSellerTrustScore(input.sellerId);
  const dailyDeltaUsed = await getDailyTrustDeltaUsed(input.sellerId);

  const { newScore } = applyTrustDeltaCaps({
    currentScore,
    rawDelta: input.rawDelta,
    dailyDeltaUsed,
  });

  if (newScore !== currentScore) {
    await recordTrustScoreHistory({
      sellerId: input.sellerId,
      oldScore: currentScore,
      newScore,
      reason: input.reason,
      eventType: input.eventType,
    });
  }

  const metrics = await gatherSellerMetrics(input.sellerId);
  const computed = computeSellerTrustScore(metrics);
  const blended = Math.round((newScore + computed.score) / 2);

  return blended;
}

export async function isRepeatSellerCancellation(sellerId: string): Promise<boolean> {
  const count = await countSellerCancellations(sellerId);
  return count >= 1;
}
