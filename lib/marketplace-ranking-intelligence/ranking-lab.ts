import { getActiveRankingVersion } from "./ranking-version";
import { computeRankingScore } from "./ranking-score";
import type { RankingInfluenceRow, RankingProductInput } from "./types";

function syntheticProduct(index: number): RankingProductInput {
  return {
    id: `synthetic_${index}`,
    name: `Synthetic product ${index}`,
    price: 1000 + index * 10,
    compareAt: null,
    status: "ACTIVE",
    stock: 5,
    views: 100 + index,
    favoritesCount: 5 + (index % 7),
    categoryId: "cat",
    categoryName: "Test",
    descriptionLength: 80,
    seoTitleLength: 20,
    seoDescriptionLength: 80,
    photoCount: 2 + (index % 4),
    hasVideo: index % 5 === 0,
    characteristicCount: 3,
    hasBrand: index % 3 === 0,
    sellerId: "seller",
    sellerBlocked: false,
    sellerTrustScore: 60 + (index % 30),
    sellerReviewsCount: index % 10,
    sellerAverageRating: 4 + (index % 10) / 10,
    sellerCompletedOrders: index % 20,
    sellerCancellationRate: 0.02,
    moderationStatus: "APPROVED",
    prohibitedHit: false,
    qualityScore: 70,
    cartAdds: index % 8,
    ordersCount: index % 5,
    promotionActive: index % 4 === 0,
  };
}

function bumpFactor(input: RankingProductInput, factor: string): RankingProductInput {
  const next = { ...input };
  switch (factor) {
    case "photos":
      next.photoCount = Math.max(next.photoCount, 5);
      break;
    case "ctr":
      next.favoritesCount = Math.round(next.views * 0.08);
      break;
    case "reviews":
      next.sellerReviewsCount = 20;
      next.sellerAverageRating = 4.8;
      break;
    case "trust":
      next.sellerTrustScore = 92;
      break;
    case "seo":
      next.seoTitleLength = 40;
      next.seoDescriptionLength = 120;
      break;
    case "price":
      next.price = Math.round(next.price * 0.95);
      next.compareAt = input.price;
      break;
    case "reviews_disabled":
      next.sellerReviewsCount = 0;
      next.sellerAverageRating = 0;
      break;
    default:
      next.photoCount += 1;
  }
  return next;
}

export async function runRankingLabExperiment(input: {
  datasetSize: number;
  changedFactor: string;
  versionId: string | null;
}): Promise<{
  before: Record<string, number>;
  after: Record<string, number>;
  rankingImpact: string;
  confidence: string;
  influences: RankingInfluenceRow[];
}> {
  const size = [100, 500, 1000, 5000].includes(input.datasetSize)
    ? input.datasetSize
    : Math.min(5000, Math.max(100, input.datasetSize));

  const { weights } = await getActiveRankingVersion();
  const products = Array.from({ length: size }, (_, i) => syntheticProduct(i + 1));

  const beforeScores = products.map((p) => computeRankingScore(p, weights).overall);
  const afterScores = products.map((p) =>
    computeRankingScore(bumpFactor(p, input.changedFactor), weights).overall,
  );

  const beforeAvg = beforeScores.reduce((a, b) => a + b, 0) / beforeScores.length;
  const afterAvg = afterScores.reduce((a, b) => a + b, 0) / afterScores.length;
  const delta = afterAvg - beforeAvg;

  const influences: RankingInfluenceRow[] = weights.map((w) => ({
    factorKey: w.factorKey,
    label: w.label,
    influencePercent:
      w.factorKey === input.changedFactor
        ? Math.min(35, Math.max(8, Math.round(Math.abs(delta) + w.weightPercent / 2)))
        : Math.max(3, Math.round(w.weightPercent * 0.6)),
  }));

  return {
    before: { averageScore: Math.round(beforeAvg * 10) / 10 },
    after: { averageScore: Math.round(afterAvg * 10) / 10 },
    rankingImpact: `${delta >= 0 ? "+" : ""}${Math.round(delta * 10) / 10} баллов в среднем`,
    confidence: size >= 1000 ? "Высокая" : size >= 500 ? "Средняя" : "Предварительная",
    influences,
  };
}

export const RANKING_LAB_DATASET_SIZES = [100, 500, 1000, 5000] as const;

export const RANKING_LAB_FACTORS = [
  { key: "photos", label: "Увеличить фото" },
  { key: "ctr", label: "Увеличить CTR" },
  { key: "reviews", label: "Улучшить отзывы" },
  { key: "trust", label: "Улучшить trust" },
  { key: "seo", label: "Улучшить SEO" },
  { key: "price", label: "Снизить цену" },
  { key: "reviews_disabled", label: "Отключить отзывы" },
] as const;
