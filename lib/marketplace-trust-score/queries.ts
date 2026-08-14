import { ProductStatus, ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { computeProductCompletenessScore } from "@/lib/conversion";
import {
  isMarketplaceNewSellerTrustEnabled,
  resolveTrustTier,
  trackFirstOrderCompleted,
} from "@/lib/marketplace-new-seller-trust";
import { trackTrustLevelReached } from "@/lib/marketplace-trust-experience/analytics";

import { computeSellerTrustScore } from "./calculator";
import { NEW_SELLER_TRUST_SCORE, TRUST_SCORE_USER_LABEL } from "./constants";
import { isMarketplaceTrustScoreModelEnabled } from "./flags";
import { listTrustScoreHistory, getLatestTrustScoreHistoryReason } from "./history";
import {
  buildProductTrustSnapshot,
  deriveAvailabilityScore,
  deriveDeliveryScore,
  deriveProductCardScore,
} from "./product-score";
import { gatherSellerMetrics, getCurrentSellerTrustScore } from "./recalculate";
import {
  buildBuyerTrustReasons,
  buildSellerTrustSignals,
  buildVerificationDetails,
} from "./signals";
import type {
  BuyerSellerTrustSnapshot,
  ProductTrustScoreSnapshot,
  SellerTrustScoreSnapshot,
} from "./types";
import { getTrustLevel } from "./constants";

export async function getSellerTrustScorePage(
  sellerId: string,
): Promise<SellerTrustScoreSnapshot | null> {
  if (!isMarketplaceTrustScoreModelEnabled()) return null;

  const [metrics, history, reputation] = await Promise.all([
    gatherSellerMetrics(sellerId),
    listTrustScoreHistory(sellerId, 8),
    prisma.sellerReputation.findUnique({ where: { sellerId } }),
  ]);

  const trustScore = reputation?.trustScore && reputation.trustScore > 0
    ? reputation.trustScore
    : await getCurrentSellerTrustScore(sellerId);

  const lastReason = history[0]?.reason ?? (await getLatestTrustScoreHistoryReason(sellerId));
  const signals = buildSellerTrustSignals({
    metrics,
    trustScore,
    lastHistoryReason: lastReason,
  });

  const computed = computeSellerTrustScore(metrics);

  return {
    enabled: true,
    trustScore,
    trustScoreLabel: TRUST_SCORE_USER_LABEL,
    trustLevel: getTrustLevel(trustScore).label,
    factors: computed.factors,
    helps: signals.helps,
    hurts: signals.hurts,
    nextImprovement: signals.nextImprovement,
    history,
    averageRating: metrics.averageReviewRating,
    reviewsCount: metrics.reviewsCount,
    completedOrders: metrics.completedOrders,
    fulfillmentPercent:
      metrics.completedOrders + metrics.cancelledBySeller + metrics.problematicOrders > 0
        ? Math.round(
            (metrics.completedOrders /
              (metrics.completedOrders +
                metrics.cancelledBySeller +
                metrics.problematicOrders)) *
              100,
          )
        : 0,
    averageShippingHours:
      metrics.shippingHoursSamples.length > 0
        ? Math.round(
            metrics.shippingHoursSamples.reduce((a, b) => a + b, 0) /
              metrics.shippingHoursSamples.length,
          )
        : null,
    verificationDetails: buildVerificationDetails({
      phoneVerified: metrics.phoneVerified,
      paymentVerified: metrics.paymentVerified,
      isVerified: metrics.isVerified,
      completedOrders: metrics.completedOrders,
    }),
  };
}

export async function getBuyerSellerTrustSnapshot(
  sellerId: string,
): Promise<BuyerSellerTrustSnapshot | null> {
  if (!isMarketplaceTrustScoreModelEnabled()) return null;

  const [metrics, trustScore] = await Promise.all([
    gatherSellerMetrics(sellerId),
    getCurrentSellerTrustScore(sellerId),
  ]);

  return {
    enabled: true,
    trustScore,
    trustLevel: getTrustLevel(trustScore).label,
    reasons: buildBuyerTrustReasons({ metrics, trustScore }),
    verificationDetails: buildVerificationDetails({
      phoneVerified: metrics.phoneVerified,
      paymentVerified: metrics.paymentVerified,
      isVerified: metrics.isVerified,
      completedOrders: metrics.completedOrders,
    }),
  };
}

export async function getProductTrustScoreForPdp(input: {
  productId: string;
  sellerId: string;
  stock: number;
  imageCount: number;
  hasPrimary: boolean;
  characteristicCount: number;
  descriptionLength: number;
}): Promise<ProductTrustScoreSnapshot | null> {
  if (!isMarketplaceTrustScoreModelEnabled()) return null;

  const [sellerTrustScore, rating, product] = await Promise.all([
    getCurrentSellerTrustScore(input.sellerId),
    prisma.productRating.findUnique({ where: { productId: input.productId } }),
    prisma.product.findUnique({
      where: { id: input.productId },
      select: { pickupEnabled: true, status: true },
    }),
  ]);

  const completeness = computeProductCompletenessScore({
    photoCount: input.imageCount,
    titleLength: 20,
    descriptionLength: input.descriptionLength,
    characteristicCount: input.characteristicCount,
    hasCategory: true,
    hasProductType: true,
    price: 1,
    hasSeller: true,
  });

  const cardScore = Math.round(
    (deriveProductCardScore({
      imageCount: input.imageCount,
      hasPrimary: input.hasPrimary,
      characteristicCount: input.characteristicCount,
      descriptionLength: input.descriptionLength,
    }) +
      completeness.score) /
      2,
  );

  return buildProductTrustSnapshot({
    productCardScore: cardScore,
    sellerTrustScore,
    averageRating: rating ? Number(rating.averageRating) : 0,
    reviewsCount: rating?.reviewsCount ?? 0,
    deliveryScore: deriveDeliveryScore(true),
    availabilityScore: deriveAvailabilityScore(
      product?.status === ProductStatus.ACTIVE ? input.stock : 0,
    ),
  });
}

export async function syncSellerTrustScoreToReputation(sellerId: string): Promise<void> {
  if (!isMarketplaceTrustScoreModelEnabled()) return;

  const metrics = await gatherSellerMetrics(sellerId);
  const trustScore = await getCurrentSellerTrustScore(sellerId);
  const previous = await prisma.sellerReputation.findUnique({
    where: { sellerId },
    select: { completedOrders: true, reviewsCount: true, trustScore: true },
  });

  if (
    isMarketplaceNewSellerTrustEnabled() &&
    (previous?.completedOrders ?? 0) === 0 &&
    metrics.completedOrders >= 1
  ) {
    trackFirstOrderCompleted(sellerId);
  }

  if (isMarketplaceNewSellerTrustEnabled()) {
    const prevTier = resolveTrustTier({
      trustScore:
        previous?.trustScore && previous.trustScore > 0
          ? previous.trustScore
          : NEW_SELLER_TRUST_SCORE,
      completedOrders: previous?.completedOrders ?? 0,
    });
    const newTier = resolveTrustTier({
      trustScore,
      completedOrders: metrics.completedOrders,
    });
    if (prevTier.id !== newTier.id) {
      trackTrustLevelReached(newTier.id);
    }
  }
  const positiveSentiment = await prisma.review.count({
    where: { sellerId, status: ReviewStatus.APPROVED, rating: { gte: 4 } },
  });
  const orderTotal = metrics.completedOrders + metrics.cancelledBySeller;
  const cancellationRate =
    orderTotal > 0 ? (metrics.cancelledBySeller / orderTotal) * 100 : 0;

  await prisma.sellerReputation.upsert({
    where: { sellerId },
    create: {
      sellerId,
      averageRating: metrics.averageReviewRating,
      reviewsCount: metrics.reviewsCount,
      completedOrders: metrics.completedOrders,
      cancellationRate,
      trustScore,
      positiveSentiment,
    },
    update: {
      averageRating: metrics.averageReviewRating,
      reviewsCount: metrics.reviewsCount,
      completedOrders: metrics.completedOrders,
      cancellationRate,
      trustScore,
      positiveSentiment,
    },
  });

  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { rating: metrics.averageReviewRating },
  });
}
