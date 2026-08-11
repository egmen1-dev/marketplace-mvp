import { Prisma, ReviewStatus, type PrismaClient } from "@prisma/client";

/**
 * Recompute a product's review aggregate from PUBLISHED reviews only
 * (sections 14, 44 — no heavy per-request aggregation). Idempotent.
 */
export async function recomputeProductReviewStats(
  db: PrismaClient,
  productId: string,
): Promise<void> {
  const grouped = await db.review.groupBy({
    by: ["rating"],
    where: { productId, status: ReviewStatus.PUBLISHED },
    _count: { _all: true },
  });

  const counts = [0, 0, 0, 0, 0]; // index 0 = 1★ … 4 = 5★
  let total = 0;
  let sum = 0;
  for (const g of grouped) {
    const idx = Math.min(5, Math.max(1, g.rating)) - 1;
    counts[idx] += g._count._all;
    total += g._count._all;
    sum += g.rating * g._count._all;
  }
  const avg = total > 0 ? sum / total : 0;

  const data = {
    avgRating: new Prisma.Decimal(avg.toFixed(2)),
    ratingCount: total,
    rating1Count: counts[0],
    rating2Count: counts[1],
    rating3Count: counts[2],
    rating4Count: counts[3],
    rating5Count: counts[4],
  };

  await db.productReviewStats.upsert({
    where: { productId },
    create: { productId, ...data },
    update: data,
  });
}

/**
 * Recompute a seller's review aggregate (average across that seller's PUBLISHED
 * product reviews — section 16). Idempotent.
 */
export async function recomputeSellerReviewStats(
  db: PrismaClient,
  sellerId: string,
): Promise<void> {
  const agg = await db.review.aggregate({
    where: { sellerId, status: ReviewStatus.PUBLISHED },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const count = agg._count._all;
  const avg = count > 0 ? Number(agg._avg.rating ?? 0) : 0;

  const data = {
    avgProductRating: new Prisma.Decimal(avg.toFixed(2)),
    reviewCount: count,
  };

  await db.sellerReviewStats.upsert({
    where: { sellerId },
    create: { sellerId, ...data },
    update: data,
  });
}

/** Refresh both aggregates for a review's product + seller. */
export async function refreshReviewAggregates(
  db: PrismaClient,
  opts: { productId: string; sellerId: string },
): Promise<void> {
  await recomputeProductReviewStats(db, opts.productId);
  await recomputeSellerReviewStats(db, opts.sellerId);
}
