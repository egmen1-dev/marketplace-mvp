import {
  OrderStatus,
  PickupReservationStatus,
  ProductStatus,
  type PrismaClient,
} from "@prisma/client";

import { computeBuyerTrust, computeSellerTrust, type TrustResult } from "./trust-engine";
import { computeProductRisk, type RiskResult } from "./risk-engine";
import { detectDuplicateListing } from "./detectors/duplicate-listing";
import { detectPriceOutlier } from "./detectors/price-outlier";
import { getEntityRiskEvents } from "./risk-event-service";

/**
 * Explainability views for /admin/risk detail pages (sections 13/14/30).
 * Recompute the signal breakdown live for a single entity (bounded queries).
 */

function daysSince(d: Date): number {
  return Math.max(0, (Date.now() - d.getTime()) / 86_400_000);
}
function median(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type SellerRiskDetail = {
  kind: "seller";
  name: string;
  trust: TrustResult;
  riskScore: number;
  events: Awaited<ReturnType<typeof getEntityRiskEvents>>;
};

export async function explainSellerRisk(
  db: PrismaClient,
  sellerId: string,
): Promise<SellerRiskDetail | null> {
  const seller = await db.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { storeName: true, isVerified: true, createdAt: true },
  });
  if (!seller) return null;
  const review = await db.sellerReviewStats.findUnique({ where: { sellerId } });
  const completedAgg = await db.productRankingStats.aggregate({
    where: { product: { sellerId } },
    _sum: { completedOrders: true },
  });
  const stats = await db.sellerTrustStats.findUnique({ where: { sellerId } });

  const trust = computeSellerTrust({
    isVerified: seller.isVerified,
    accountAgeDays: daysSince(seller.createdAt),
    completedTransactions: completedAgg._sum.completedOrders ?? 0,
    avgRating: review ? Number(review.avgProductRating) : 0,
    ratingCount: review?.reviewCount ?? 0,
    cancellationRate: null,
  });
  return {
    kind: "seller",
    name: seller.storeName,
    trust,
    riskScore: stats?.riskScore ?? 0,
    events: await getEntityRiskEvents(db, { sellerId }),
  };
}

export type UserRiskDetail = {
  kind: "user";
  name: string;
  trust: TrustResult;
  riskScore: number;
  events: Awaited<ReturnType<typeof getEntityRiskEvents>>;
};

export async function explainUserRisk(
  db: PrismaClient,
  userId: string,
): Promise<UserRiskDetail | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, createdAt: true },
  });
  if (!user) return null;
  const [completedOrders, cancelledOrders, completedRes, cancelledRes] =
    await Promise.all([
      db.order.count({ where: { userId, status: OrderStatus.DELIVERED } }),
      db.order.count({ where: { userId, status: OrderStatus.CANCELLED } }),
      db.pickupReservation.count({ where: { buyerId: userId, status: PickupReservationStatus.COMPLETED } }),
      db.pickupReservation.count({ where: { buyerId: userId, status: PickupReservationStatus.CANCELLED } }),
    ]);
  const stats = await db.userTrustStats.findUnique({ where: { userId } });
  const trust = computeBuyerTrust({
    accountAgeDays: daysSince(user.createdAt),
    completedOrders,
    cancelledOrders,
    completedReservations: completedRes,
    cancelledReservations: cancelledRes,
    highRiskEventCount: stats?.highRiskEventCount ?? 0,
  });
  return {
    kind: "user",
    name: user.name ?? "Покупатель",
    trust,
    riskScore: stats?.riskScore ?? 0,
    events: await getEntityRiskEvents(db, { userId }),
  };
}

export type ProductRiskDetail = {
  kind: "product";
  name: string;
  risk: RiskResult;
  events: Awaited<ReturnType<typeof getEntityRiskEvents>>;
};

export async function explainProductRisk(
  db: PrismaClient,
  productId: string,
): Promise<ProductRiskDetail | null> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      price: true,
      description: true,
      productTypeId: true,
      sellerId: true,
      _count: { select: { images: true } },
    },
  });
  if (!product) return null;

  let priceOutlierScore = 0;
  if (product.productTypeId) {
    const peers = await db.product.findMany({
      where: { productTypeId: product.productTypeId, status: ProductStatus.ACTIVE, id: { not: productId } },
      select: { price: true },
      take: 500,
    });
    priceOutlierScore = detectPriceOutlier({
      price: Number(product.price),
      median: median(peers.map((p) => Number(p.price))),
      sampleSize: peers.length,
    }).score;
  }
  const siblings = await db.product.findMany({
    where: { sellerId: product.sellerId, id: { not: productId } },
    select: { id: true, name: true, description: true, price: true, productTypeId: true },
    take: 200,
  });
  const dup = detectDuplicateListing(
    { id: productId, title: product.name, description: product.description, price: Number(product.price), productTypeId: product.productTypeId },
    siblings.map((s) => ({ id: s.id, title: s.name, description: s.description, price: Number(s.price), productTypeId: s.productTypeId })),
  );
  const sellerRisk = await db.sellerTrustStats.findUnique({
    where: { sellerId: product.sellerId },
    select: { riskScore: true },
  });

  const risk = computeProductRisk({
    priceOutlierScore,
    duplicateRiskScore: dup.score,
    sellerRiskScore: sellerRisk?.riskScore ?? 0,
    hasImages: product._count.images > 0,
    hasDescription: Boolean(product.description?.trim()),
    hasProductType: Boolean(product.productTypeId),
  });
  return {
    kind: "product",
    name: product.name,
    risk,
    events: await getEntityRiskEvents(db, { productId }),
  };
}
