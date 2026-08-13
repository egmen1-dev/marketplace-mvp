import { ModerationStatus, ProductStatus, ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { isMarketplaceTrustLoopEnabled } from "./flags";
import { getModerationQueueSummary, listModerationQueue } from "./moderation/queue";
import { runProductModerationChecks } from "./moderation/rules";
import { buildAiModerationAdvice } from "./ai-moderation/advisor";
import {
  getProductRatingSnapshot,
  listApprovedProductReviews,
} from "./ratings/product-rating";
import { getSellerReputationSnapshot } from "./ratings/seller-rating";
import type { AdminTrustHealth } from "./reviews/types";

export async function getProductReviewsForPdp(productId: string) {
  if (!isMarketplaceTrustLoopEnabled()) {
    return { rating: null, reviews: [] };
  }
  const [rating, reviews] = await Promise.all([
    getProductRatingSnapshot(productId),
    listApprovedProductReviews(productId, 5),
  ]);
  return {
    rating,
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      pros: r.pros,
      cons: r.cons,
      buyerName: r.buyer.name,
      createdAt: r.createdAt.toISOString(),
      photos: r.photos,
    })),
  };
}

export async function getSellerReputationPage(sellerProfileId: string) {
  if (!isMarketplaceTrustLoopEnabled()) return null;
  return getSellerReputationSnapshot(sellerProfileId);
}

export async function getProductModerationPreview(productId: string) {
  if (!isMarketplaceTrustLoopEnabled()) return null;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { name: true },
  });
  if (!product) return null;
  const checks = await runProductModerationChecks(productId);
  return {
    ...checks,
    aiAdvice: buildAiModerationAdvice({ issues: checks.issues, productName: product.name }),
  };
}

export async function getAdminTrustHealth(): Promise<AdminTrustHealth> {
  if (!isMarketplaceTrustLoopEnabled()) {
    return {
      enabled: false,
      averageRating: 0,
      reviewsCount: 0,
      highTrustSellersPercent: 0,
      pendingModeration: 0,
      problematicCards: 0,
      prohibitedAttempts: 0,
      cardsWithoutPhotos: 0,
      lowQualityCards: 0,
    };
  }

  const [
    reviewAgg,
    highTrust,
    sellerCount,
    queue,
    problematic,
    prohibited,
    noPhotos,
    lowQuality,
  ] = await Promise.all([
    prisma.review.aggregate({
      where: { status: ReviewStatus.APPROVED },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.sellerReputation.count({ where: { trustScore: { gte: 85 } } }),
    prisma.sellerProfile.count(),
    getModerationQueueSummary(),
    prisma.productModeration.count({
      where: { status: ModerationStatus.NEEDS_FIX },
    }),
    prisma.productModeration.count({ where: { prohibitedHit: true } }),
    prisma.product.count({
      where: { status: ProductStatus.ACTIVE, images: { none: {} } },
    }),
    prisma.productModeration.count({
      where: { qualityScore: { lt: 60 } },
    }),
  ]);

  return {
    enabled: true,
    averageRating: Number(reviewAgg._avg.rating ?? 0),
    reviewsCount: reviewAgg._count._all,
    highTrustSellersPercent:
      sellerCount > 0 ? Math.round((highTrust / sellerCount) * 100) : 0,
    pendingModeration: queue.newProducts + queue.reviews,
    problematicCards: problematic,
    prohibitedAttempts: prohibited,
    cardsWithoutPhotos: noPhotos,
    lowQualityCards: lowQuality,
  };
}

export { getModerationQueueSummary, listModerationQueue };
