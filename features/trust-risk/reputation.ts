import {
  OrderStatus,
  PickupReservationStatus,
  Prisma,
  ProductStatus,
  RiskEventStatus,
  type PrismaClient,
} from "@prisma/client";

import { computeBuyerTrust, computeSellerTrust } from "./trust-engine";
import { computeProductRisk } from "./risk-engine";
import { aggregateEventRisk } from "./risk-engine";
import { detectPriceOutlier } from "./detectors/price-outlier";
import { detectDuplicateListing } from "./detectors/duplicate-listing";

/**
 * ReputationService (AGENT-019, sections 15–18). Precomputes trust/risk stats
 * from REAL signals (no N+1 on hot paths). Idempotent; safe to run repeatedly.
 */

function daysSince(d: Date): number {
  return Math.max(0, (Date.now() - d.getTime()) / 86_400_000);
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Open (non-dismissed) risk-event score deltas for an entity scope. */
async function openRiskDeltas(
  db: PrismaClient,
  scope: { userId?: string; sellerId?: string; productId?: string },
): Promise<{ deltas: number[]; count: number; highCount: number }> {
  const events = await db.riskEvent.findMany({
    where: {
      ...scope,
      status: { notIn: [RiskEventStatus.DISMISSED] },
    },
    select: { scoreDelta: true, severity: true },
  });
  return {
    deltas: events.map((e) => e.scoreDelta),
    count: events.length,
    highCount: events.filter((e) => e.severity === "HIGH" || e.severity === "CRITICAL").length,
  };
}

export async function recomputeSellerTrustStats(
  db: PrismaClient,
  sellerId: string,
): Promise<void> {
  const seller = await db.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { isVerified: true, createdAt: true },
  });
  if (!seller) return;

  const review = await db.sellerReviewStats.findUnique({ where: { sellerId } });
  const completedAgg = await db.productRankingStats.aggregate({
    where: { product: { sellerId } },
    _sum: { completedOrders: true },
  });
  const completedTransactions = completedAgg._sum.completedOrders ?? 0;

  const risk = await openRiskDeltas(db, { sellerId });
  const riskResult = aggregateEventRisk(risk.deltas);

  const trust = computeSellerTrust({
    isVerified: seller.isVerified,
    accountAgeDays: daysSince(seller.createdAt),
    completedTransactions,
    avgRating: review ? Number(review.avgProductRating) : 0,
    ratingCount: review?.reviewCount ?? 0,
    cancellationRate: null, // not reliably tracked yet — neutral (section 3)
  });

  const data = {
    trustScore: trust.score,
    riskScore: riskResult.score,
    completedTransactions,
    cancellationRate: new Prisma.Decimal(0),
    avgRating: new Prisma.Decimal((review ? Number(review.avgProductRating) : 0).toFixed(2)),
    ratingCount: review?.reviewCount ?? 0,
    verified: seller.isVerified,
    riskEventCount: risk.count,
  };
  await db.sellerTrustStats.upsert({
    where: { sellerId },
    create: { sellerId, ...data },
    update: data,
  });
}

export async function recomputeUserTrustStats(
  db: PrismaClient,
  userId: string,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (!user) return;

  const [completedOrders, cancelledOrders, completedRes, cancelledRes] =
    await Promise.all([
      db.order.count({ where: { userId, status: OrderStatus.DELIVERED } }),
      db.order.count({ where: { userId, status: OrderStatus.CANCELLED } }),
      db.pickupReservation.count({
        where: { buyerId: userId, status: PickupReservationStatus.COMPLETED },
      }),
      db.pickupReservation.count({
        where: { buyerId: userId, status: PickupReservationStatus.CANCELLED },
      }),
    ]);

  const risk = await openRiskDeltas(db, { userId });
  const riskResult = aggregateEventRisk(risk.deltas);

  const trust = computeBuyerTrust({
    accountAgeDays: daysSince(user.createdAt),
    completedOrders,
    cancelledOrders,
    completedReservations: completedRes,
    cancelledReservations: cancelledRes,
    highRiskEventCount: risk.highCount,
  });

  const data = {
    trustScore: trust.score,
    riskScore: riskResult.score,
    completedOrders,
    cancelledOrders,
    completedReservations: completedRes,
    cancelledReservations: cancelledRes,
    riskEventCount: risk.count,
    highRiskEventCount: risk.highCount,
  };
  await db.userTrustStats.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function recomputeProductRiskStats(
  db: PrismaClient,
  productId: string,
): Promise<void> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      price: true,
      description: true,
      productTypeId: true,
      sellerId: true,
      _count: { select: { images: true } },
    },
  });
  if (!product) return;

  // Price outlier vs same-ProductType median.
  let priceOutlierScore = 0;
  if (product.productTypeId) {
    const peers = await db.product.findMany({
      where: {
        productTypeId: product.productTypeId,
        status: ProductStatus.ACTIVE,
        id: { not: product.id },
      },
      select: { price: true },
      take: 500,
    });
    const med = median(peers.map((p) => Number(p.price)));
    const outlier = detectPriceOutlier({
      price: Number(product.price),
      median: med,
      sampleSize: peers.length,
    });
    priceOutlierScore = outlier.score;
  }

  // Duplicate listing vs same seller's other listings.
  const sellerListings = await db.product.findMany({
    where: { sellerId: product.sellerId, id: { not: product.id } },
    select: { id: true, name: true, description: true, price: true, productTypeId: true },
    take: 200,
  });
  const dup = detectDuplicateListing(
    {
      id: product.id,
      title: (await db.product.findUnique({ where: { id: product.id }, select: { name: true } }))?.name ?? "",
      description: product.description,
      price: Number(product.price),
      productTypeId: product.productTypeId,
    },
    sellerListings.map((l) => ({
      id: l.id,
      title: l.name,
      description: l.description,
      price: Number(l.price),
      productTypeId: l.productTypeId,
    })),
  );

  const sellerTrust = await db.sellerTrustStats.findUnique({
    where: { sellerId: product.sellerId },
    select: { riskScore: true },
  });
  const sellerRiskContribution = sellerTrust?.riskScore ?? 0;

  const risk = computeProductRisk({
    priceOutlierScore,
    duplicateRiskScore: dup.score,
    sellerRiskScore: sellerRiskContribution,
    hasImages: product._count.images > 0,
    hasDescription: Boolean(product.description?.trim()),
    hasProductType: Boolean(product.productTypeId),
  });

  const data = {
    riskScore: risk.score,
    priceOutlierScore,
    duplicateRiskScore: dup.score,
    sellerRiskContribution,
  };
  await db.productRiskStats.upsert({
    where: { productId },
    create: { productId, ...data },
    update: data,
  });
}
