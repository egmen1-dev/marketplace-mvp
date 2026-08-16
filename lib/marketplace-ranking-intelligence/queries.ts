import { ProductStatus } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { prisma } from "@/lib/prisma";

import { evaluateRankingEligibility } from "./eligibility";
import { evaluateProductRanking } from "./ranking-engine";
import { buildRankingExplanation } from "./ranking-explainer";
import { appendRankingHistory, listRankingHistory, upsertRankingSnapshot } from "./ranking-history";
import { pickNextBestAction } from "./ranking-recommendations";
import { estimatePosition, simulateRankingChanges } from "./ranking-simulator";
import { getActiveRankingVersion } from "./ranking-version";
import { aggregateFailureReasons, deriveRankingHealth } from "./ranking-diagnostics";
import { listRankingExperiments } from "./experiments";
import { isMarketplaceRankingIntelligenceEnabled } from "./flags";
import { trackRankingQualityGateFailed } from "./analytics";
import type {
  AdminRankingDashboard,
  RankingProductInput,
  RankingProductRow,
  RankingSimulateInput,
  RankingSimulationResult,
  SellerRankingDashboard,
} from "./types";

async function loadProductInput(productId: string): Promise<RankingProductInput | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { select: { url: true } },
      category: { select: { name: true } },
      productModeration: true,
      characteristicValues: { select: { id: true } },
      seller: {
        include: { reputation: true, user: { select: { isBlocked: true } } },
      },
    },
  });
  if (!product) return null;

  const orderAgg = await prisma.orderItem.aggregate({
    where: { productId: product.id },
    _count: { _all: true },
  });

  return {
    id: product.id,
    name: product.name,
    price: toPriceNumber(product.price),
    compareAt: product.compareAt ? toPriceNumber(product.compareAt) : null,
    status: product.status,
    stock: product.stock,
    views: product.views,
    favoritesCount: product.favoritesCount,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    descriptionLength: product.description?.length ?? 0,
    seoTitleLength: product.seoTitle?.length ?? 0,
    seoDescriptionLength: product.seoDescription?.length ?? 0,
    photoCount: product.images.length,
    hasVideo: false,
    characteristicCount: product.characteristicValues.length,
    hasBrand: Boolean(product.brandId),
    sellerId: product.sellerId,
    sellerBlocked: product.seller.isBlocked,
    sellerTrustScore: product.seller.reputation?.trustScore ?? 0,
    sellerReviewsCount: product.seller.reputation?.reviewsCount ?? 0,
    sellerAverageRating: Number(product.seller.reputation?.averageRating ?? 0),
    sellerCompletedOrders: product.seller.reputation?.completedOrders ?? 0,
    sellerCancellationRate: Number(product.seller.reputation?.cancellationRate ?? 0),
    moderationStatus: product.productModeration?.status ?? null,
    prohibitedHit: product.productModeration?.prohibitedHit ?? false,
    qualityScore: product.productModeration?.qualityScore ?? null,
    cartAdds: product.favoritesCount,
    ordersCount: orderAgg._count._all,
    promotionActive: false,
  };
}

async function peerScoresForCategory(categoryId: string | null, excludeId?: string): Promise<number[]> {
  if (!categoryId) return [];
  const { weights } = await getActiveRankingVersion();
  const peers = await prisma.product.findMany({
    where: {
      categoryId,
      status: ProductStatus.ACTIVE,
      stock: { gt: 0 },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
    take: 100,
  });

  const scores: number[] = [];
  for (const peer of peers) {
    const input = await loadProductInput(peer.id);
    if (!input) continue;
    const result = await evaluateProductRanking(input, weights);
    if (result.eligibility.status === "ELIGIBLE") {
      scores.push(result.score.overall);
    }
  }
  return scores;
}

async function buildProductRow(input: RankingProductInput): Promise<RankingProductRow> {
  const evaluation = await evaluateProductRanking(input);
  const peers = await peerScoresForCategory(input.categoryId);
  const position = evaluation.eligibility.status === "ELIGIBLE"
    ? estimatePosition(evaluation.score.overall, peers, input.id)
    : null;

  const explanation = buildRankingExplanation(input, evaluation.score, position);
  const nextAction = pickNextBestAction(input, evaluation.score);

  const { oldScore, newScore } = await upsertRankingSnapshot({
    productId: input.id,
    overallScore: evaluation.score.overall,
    productScore: evaluation.score.product,
    sellerScore: evaluation.score.seller,
    behaviourScore: evaluation.score.behaviour,
    commercialScore: evaluation.score.commercial,
    estimatedPosition: position,
    eligibility: evaluation.eligibility.status,
    topBlockedReason: evaluation.qualityGate.topBlocked ? evaluation.qualityGate.reason : null,
    algorithmVersion: evaluation.algorithmVersion,
    versionId: evaluation.versionId,
  });

  if (oldScore != null && oldScore !== newScore) {
    await appendRankingHistory({
      productId: input.id,
      oldScore,
      newScore,
      reason: "Пересчёт позиции",
      algorithmVersion: evaluation.algorithmVersion,
      versionId: evaluation.versionId,
      eventType: "RECALCULATED",
    });
  }

  if (evaluation.qualityGate.topBlocked) {
    trackRankingQualityGateFailed(input.id);
  }

  const history = await listRankingHistory(input.id, 5);

  return {
    id: input.id,
    name: input.name,
    imageUrl: null,
    price: input.price,
    eligibility: evaluation.eligibility,
    score: evaluation.score,
    explanation,
    nextAction,
    qualityGate: evaluation.qualityGate,
    history,
  };
}

export async function getSellerRankingDashboard(
  sellerProfileId: string,
): Promise<SellerRankingDashboard> {
  if (!isMarketplaceRankingIntelligenceEnabled()) {
    return {
      enabled: false,
      algorithmVersion: "v1",
      averageScore: 0,
      eligibleCount: 0,
      notEligibleCount: 0,
      products: [],
    };
  }

  const { version } = await getActiveRankingVersion();
  const products = await prisma.product.findMany({
    where: { sellerId: sellerProfileId, status: { not: ProductStatus.ARCHIVED } },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true },
  });

  const rows: RankingProductRow[] = [];
  for (const p of products) {
    const input = await loadProductInput(p.id);
    if (!input) continue;
    rows.push(await buildProductRow(input));
  }

  const eligibleCount = rows.filter((r) => r.eligibility.status === "ELIGIBLE").length;
  const averageScore =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + (r.score?.overall ?? 0), 0) / rows.length)
      : 0;

  return {
    enabled: true,
    algorithmVersion: version.version,
    averageScore,
    eligibleCount,
    notEligibleCount: rows.length - eligibleCount,
    products: rows,
  };
}

export async function simulateSellerProductRanking(input: {
  sellerProfileId: string;
  productId: string;
  changes: RankingSimulateInput;
}): Promise<RankingSimulationResult | null> {
  if (!isMarketplaceRankingIntelligenceEnabled()) return null;
  const productInput = await loadProductInput(input.productId);
  if (!productInput || productInput.sellerId !== input.sellerProfileId) return null;

  const { weights } = await getActiveRankingVersion();
  const peers = await peerScoresForCategory(productInput.categoryId);
  const current = await evaluateProductRanking(productInput, weights);

  return simulateRankingChanges({
    product: productInput,
    peerScores: peers,
    weights,
    changes: input.changes,
  });
}

export async function getAdminRankingDashboard(): Promise<AdminRankingDashboard> {
  if (!isMarketplaceRankingIntelligenceEnabled()) {
    return {
      enabled: false,
      algorithmVersion: "v1",
      marketplaceAverage: 0,
      averageTrust: 0,
      averageSeo: 0,
      averagePhotoQuality: 0,
      topFailureReasons: [],
      worstCategories: [],
      influences: [],
      runningExperiments: 0,
      rankingHealth: "attention",
      experiments: [],
    };
  }

  const { version } = await getActiveRankingVersion();
  const [snapshots, reputations, influenceRow, experiments] = await Promise.all([
    prisma.productRankingSnapshot.findMany({
      take: 500,
      orderBy: { computedAt: "desc" },
      include: { product: { select: { category: { select: { name: true } } } } },
    }),
    prisma.sellerReputation.findMany({ take: 200 }),
    prisma.rankingInfluenceSnapshot.findFirst({
      where: { versionId: version.id },
      orderBy: { computedAt: "desc" },
    }),
    listRankingExperiments(10),
  ]);

  const marketplaceAverage =
    snapshots.length > 0
      ? Math.round(snapshots.reduce((s, r) => s + r.overallScore, 0) / snapshots.length)
      : 0;

  const averageTrust =
    reputations.length > 0
      ? Math.round(reputations.reduce((s, r) => s + r.trustScore, 0) / reputations.length)
      : 0;

  const averageSeo =
    snapshots.length > 0
      ? Math.round(snapshots.reduce((s, r) => s + r.productScore, 0) / snapshots.length)
      : 0;

  const averagePhotoQuality = averageSeo;

  const notEligible = snapshots.filter((s) => s.eligibility === "NOT_ELIGIBLE").length;
  const notEligibleRatio = snapshots.length > 0 ? notEligible / snapshots.length : 0;

  const failureRows = snapshots
    .filter((s) => s.eligibility === "NOT_ELIGIBLE")
    .map((s) => ({ reasons: s.topBlockedReason ? [s.topBlockedReason] : ["Не участвует"] }));

  const categoryMap = new Map<string, { sum: number; count: number }>();
  for (const snap of snapshots) {
    const name = snap.product.category?.name;
    if (!name) continue;
    const prev = categoryMap.get(name) ?? { sum: 0, count: 0 };
    categoryMap.set(name, { sum: prev.sum + snap.overallScore, count: prev.count + 1 });
  }
  const worstCategories = [...categoryMap.entries()]
    .map(([name, v]) => ({ name, avgScore: Math.round(v.sum / v.count) }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 6);

  const influenceRows =
    influenceRow?.influences && Array.isArray(influenceRow.influences)
      ? (influenceRow.influences as Array<{ factorKey: string; label: string; influencePercent: number }>)
      : (await getActiveRankingVersion()).weights.map((w) => ({
          factorKey: w.factorKey,
          label: w.label,
          influencePercent: w.weightPercent,
        }));

  return {
    enabled: true,
    algorithmVersion: version.version,
    marketplaceAverage,
    averageTrust,
    averageSeo,
    averagePhotoQuality,
    topFailureReasons: aggregateFailureReasons(failureRows),
    worstCategories,
    influences: influenceRows,
    runningExperiments: experiments.filter((e) => e.status === "RUNNING").length,
    rankingHealth: deriveRankingHealth({ marketplaceAverage, notEligibleRatio }),
    experiments,
  };
}

export { loadProductInput };

export async function loadPeerScoresForProduct(productId: string): Promise<number[]> {
  const input = await loadProductInput(productId);
  if (!input) return [];
  return peerScoresForCategory(input.categoryId, input.id);
}
