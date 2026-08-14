import { ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { gatherSellerMetrics, getCurrentSellerTrustScore } from "@/lib/marketplace-trust-score/recalculate";
import { isMarketplaceTrustScoreModelEnabled } from "@/lib/marketplace-trust-score/flags";

import { getAdminNewSellerStats } from "./admin-analytics";
import {
  buildBuyerProtectionLines,
  buildFirstBuyerExperienceLines,
  buildFirstReviewPrompt,
  productHasQualityCard,
} from "./buyer-copy";
import { buildSellerCoach } from "./coach";
import { START_TRUST_EXPLANATION } from "./constants";
import { isMarketplaceNewSellerTrustEnabled } from "./flags";
import { buildTrustProgressSteps } from "./progress";
import {
  daysSinceJoined,
  formatDaysAgoLabel,
  isNewSellerStatus,
  resolveTrustTier,
} from "./tiers";
import type {
  AdminNewSellerStats,
  BuyerNewSellerSnapshot,
  FirstReviewPromptSnapshot,
  NewSellerTrustSnapshot,
} from "./types";

export async function getNewSellerTrustSnapshot(
  sellerId: string,
): Promise<NewSellerTrustSnapshot | null> {
  if (!isMarketplaceNewSellerTrustEnabled() || !isMarketplaceTrustScoreModelEnabled()) {
    return null;
  }

  const [metrics, trustScore, profile] = await Promise.all([
    gatherSellerMetrics(sellerId),
    getCurrentSellerTrustScore(sellerId),
    prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: { createdAt: true },
    }),
  ]);

  if (!profile) return null;

  const days = daysSinceJoined(profile.createdAt);
  const isNewSeller = isNewSellerStatus({
    completedOrders: metrics.completedOrders,
    reviewsCount: metrics.reviewsCount,
  });

  return {
    enabled: true,
    isNewSeller,
    daysSinceJoined: days,
    joinedLabel: formatDaysAgoLabel(days),
    trustScore,
    trustTier: resolveTrustTier({
      trustScore,
      completedOrders: metrics.completedOrders,
    }),
    startExplanation: START_TRUST_EXPLANATION,
    progressSteps: buildTrustProgressSteps(metrics),
    coach: isNewSeller ? buildSellerCoach(metrics) : null,
  };
}

export async function getBuyerNewSellerSnapshot(input: {
  sellerId: string;
  productImageCount: number;
  productHasPrimary: boolean;
  productDescriptionLength: number;
  productReviewsCount: number;
}): Promise<BuyerNewSellerSnapshot | null> {
  if (!isMarketplaceNewSellerTrustEnabled() || !isMarketplaceTrustScoreModelEnabled()) {
    return null;
  }

  const [metrics, trustScore] = await Promise.all([
    gatherSellerMetrics(input.sellerId),
    getCurrentSellerTrustScore(input.sellerId),
  ]);

  const isNewSeller = isNewSellerStatus({
    completedOrders: metrics.completedOrders,
    reviewsCount: metrics.reviewsCount,
  });
  const trustTier = resolveTrustTier({
    trustScore,
    completedOrders: metrics.completedOrders,
  });
  const hasQualityCard = productHasQualityCard({
    imageCount: input.productImageCount,
    hasPrimary: input.productHasPrimary,
    descriptionLength: input.productDescriptionLength,
  });

  return {
    enabled: true,
    isNewSeller,
    trustTier,
    firstBuyerLines: isNewSeller
      ? buildFirstBuyerExperienceLines({ metrics, productHasQualityCard: hasQualityCard })
      : [],
    protectionLines: isNewSeller ? buildBuyerProtectionLines() : [],
    showFirstBuyerExperience: isNewSeller,
  };
}

export async function getFirstReviewPrompt(input: {
  productId: string;
  productName: string;
  sellerId: string;
}): Promise<FirstReviewPromptSnapshot | null> {
  if (!isMarketplaceNewSellerTrustEnabled()) return null;

  const reviewCount = await prisma.review.count({
    where: { productId: input.productId, status: ReviewStatus.APPROVED },
  });
  if (reviewCount > 0) return null;

  const metrics = await gatherSellerMetrics(input.sellerId);
  if (metrics.completedOrders === 0) return null;

  return {
    enabled: true,
    message: buildFirstReviewPrompt(input.productName),
    productName: input.productName,
  };
}

export async function getAdminNewSellerTrustStats(): Promise<AdminNewSellerStats | null> {
  if (!isMarketplaceNewSellerTrustEnabled()) return null;
  return getAdminNewSellerStats();
}
