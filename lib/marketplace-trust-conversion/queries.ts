import { ProductStatus, ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isMarketplaceNewSellerTrustEnabled } from "@/lib/marketplace-new-seller-trust";
import { gatherSellerMetrics, getCurrentSellerTrustScore } from "@/lib/marketplace-trust-score/recalculate";
import { isMarketplaceTrustScoreModelEnabled } from "@/lib/marketplace-trust-score/flags";
import { resolveTrustTier } from "@/lib/marketplace-new-seller-trust/tiers";

import { computeTrustImpactFromEvents } from "./correlation";
import { buildBuyerDoubtSnapshot } from "./doubt-detection";
import { getTrustExperimentFoundation } from "./experiments";
import { isMarketplaceTrustConversionEnabled } from "./flags";
import { buildTrustConversionFunnel } from "./funnel";
import { buildProductTrustExplanation } from "./product-explanation";
import {
  buildAdminTrustLossInsights,
  buildSellerTrustFeedback,
} from "./seller-feedback";
import type {
  AdminTrustInsightsSnapshot,
  BuyerDoubtSnapshot,
  ProductTrustExplanationSnapshot,
  SellerTrustFeedbackSnapshot,
  TrustConversionFunnelSnapshot,
  TrustExperimentFoundation,
  TrustImpactSnapshot,
} from "./types";

const TRUST_EVENTS = [
  "product_view",
  "trust_block_view",
  "trust_details_open",
  "seller_reputation_open",
  "new_seller_trust_view",
  "add_to_cart",
  "purchase_complete",
  "trust_purchase_after_view",
];

async function loadTrustAnalyticsWindow(windowDays: number) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [grouped, visitorRows] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["event"],
      where: {
        createdAt: { gte: since },
        event: { in: TRUST_EVENTS },
      },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: since },
        visitorId: { not: null },
        event: { in: TRUST_EVENTS },
      },
      select: { event: true, visitorId: true, entityId: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    counts[row.event] = row._count._all;
  }

  const uniques: Record<string, number> = {};
  const sets: Record<string, Set<string>> = {};
  for (const row of visitorRows) {
    if (!row.visitorId) continue;
    if (!sets[row.event]) sets[row.event] = new Set();
    sets[row.event]!.add(row.visitorId);
  }
  for (const [event, set] of Object.entries(sets)) {
    uniques[event] = set.size;
  }

  return { since, counts, uniques, visitorRows };
}

export async function getTrustConversionFunnel(
  windowDays = 7,
): Promise<TrustConversionFunnelSnapshot | null> {
  if (!isMarketplaceTrustConversionEnabled()) return null;

  const { counts, uniques } = await loadTrustAnalyticsWindow(windowDays);

  return {
    enabled: true,
    windowDays,
    steps: buildTrustConversionFunnel({ counts, uniques }),
  };
}

export async function getAdminTrustImpact(
  windowDays = 7,
): Promise<TrustImpactSnapshot | null> {
  if (!isMarketplaceTrustConversionEnabled()) return null;

  const { visitorRows } = await loadTrustAnalyticsWindow(windowDays);
  return computeTrustImpactFromEvents({ rows: visitorRows, windowDays });
}

export async function getAdminTrustInsights(
  windowDays = 7,
): Promise<AdminTrustInsightsSnapshot | null> {
  if (!isMarketplaceTrustConversionEnabled()) return null;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [products, newSellers, slowShipSellers] = await Promise.all([
    prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      select: {
        views: true,
        _count: {
          select: { images: true, characteristicValues: true, reviews: true },
        },
      },
      take: 500,
    }),
    prisma.sellerProfile.count({
      where: {
        createdAt: { gte: since },
        reputation: { is: { completedOrders: { lt: 1 } } },
      },
    }),
    prisma.sellerReputation.count({
      where: {
        completedOrders: { gte: 5 },
        cancellationRate: { gt: 15 },
      },
    }),
  ]);

  let noReviews = 0;
  let noPhotos = 0;
  let noSpecs = 0;

  for (const product of products) {
    if (product._count.reviews === 0) noReviews += 1;
    if (product._count.images < 3) noPhotos += 1;
    if (product._count.characteristicValues < 3) noSpecs += 1;
  }

  return {
    enabled: true,
    windowDays,
    topReasons: buildAdminTrustLossInsights({
      noReviews,
      newSeller: newSellers,
      slowShipping: slowShipSellers,
      noPhotos,
      noSpecs,
    }),
  };
}

export async function getBuyerDoubtSnapshot(input: {
  productId: string;
  views: number;
  cartAdds: number;
  reviewsCount: number;
  imageCount: number;
  characteristicCount: number;
  isNewSeller: boolean;
  deliverySlow?: boolean;
}): Promise<BuyerDoubtSnapshot | null> {
  if (!isMarketplaceTrustConversionEnabled()) return null;

  return buildBuyerDoubtSnapshot({
    views: input.views,
    cartAdds: input.cartAdds,
    reviewsCount: input.reviewsCount,
    imageCount: input.imageCount,
    isNewSeller: input.isNewSeller,
    deliverySlow: input.deliverySlow ?? false,
    characteristicCount: input.characteristicCount,
  });
}

export async function getProductTrustExplanationSnapshot(input: {
  productId: string;
  imageCount: number;
  characteristicCount: number;
  reviewsCount: number;
  sellerId: string;
}): Promise<ProductTrustExplanationSnapshot | null> {
  if (!isMarketplaceTrustConversionEnabled()) return null;

  let sellerTierLabel: string | null = null;
  let sellerReliable = false;

  if (isMarketplaceTrustScoreModelEnabled()) {
    const [metrics, trustScore] = await Promise.all([
      gatherSellerMetrics(input.sellerId),
      getCurrentSellerTrustScore(input.sellerId),
    ]);
    const tier = resolveTrustTier({
      trustScore,
      completedOrders: metrics.completedOrders,
    });
    sellerTierLabel = tier.label;
    sellerReliable = tier.id === "reliable" || tier.id === "high_trust";
  } else if (isMarketplaceNewSellerTrustEnabled()) {
    sellerTierLabel = "новый продавец";
  }

  return buildProductTrustExplanation({
    imageCount: input.imageCount,
    characteristicCount: input.characteristicCount,
    reviewsCount: input.reviewsCount,
    sellerTierLabel,
    sellerReliable,
  });
}

export async function getSellerTrustFeedback(
  sellerId: string,
  windowDays = 30,
): Promise<SellerTrustFeedbackSnapshot | null> {
  if (!isMarketplaceTrustConversionEnabled()) return null;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const products = await prisma.product.findMany({
    where: { sellerId, status: ProductStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      views: true,
      _count: { select: { images: true, characteristicValues: true, reviews: true } },
    },
    take: 30,
  });

  const productIds = products.map((p) => p.id);
  const [cartGroups, reviewCounts] = await Promise.all([
    productIds.length
      ? prisma.analyticsEvent.groupBy({
          by: ["entityId"],
          where: {
            event: "add_to_cart",
            entityId: { in: productIds },
            createdAt: { gte: since },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    productIds.length
      ? prisma.review.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds }, status: ReviewStatus.APPROVED },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const cartByProduct = new Map(
    cartGroups.filter((g) => g.entityId).map((g) => [g.entityId!, g._count._all]),
  );
  const reviewsByProduct = new Map(reviewCounts.map((r) => [r.productId, r._count._all]));

  let isNewSeller = false;
  if (isMarketplaceTrustScoreModelEnabled()) {
    const metrics = await gatherSellerMetrics(sellerId);
    isNewSeller = metrics.completedOrders < 10;
  }

  return buildSellerTrustFeedback(
    products.map((p) => ({
      productId: p.id,
      name: p.name,
      views: p.views,
      cartAdds: cartByProduct.get(p.id) ?? 0,
      reviewsCount: reviewsByProduct.get(p.id) ?? p._count.reviews,
      imageCount: p._count.images,
      characteristicCount: p._count.characteristicValues,
      isNewSeller,
    })),
  );
}

export async function getTrustExperimentFoundationSnapshot(): Promise<
  TrustExperimentFoundation | null
> {
  if (!isMarketplaceTrustConversionEnabled()) return null;
  return getTrustExperimentFoundation();
}

export async function getPdpTrustConversionAnalytics(input: {
  productId: string;
  windowDays?: number;
}): Promise<{ views: number; cartAdds: number }> {
  const windowDays = input.windowDays ?? 30;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [views, cartAdds] = await Promise.all([
    prisma.analyticsEvent.count({
      where: {
        event: "product_view",
        entityId: input.productId,
        createdAt: { gte: since },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        event: "add_to_cart",
        entityId: input.productId,
        createdAt: { gte: since },
      },
    }),
  ]);

  return { views, cartAdds };
}
