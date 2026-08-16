import type {
  RankingFactorScore,
  RankingProductInput,
  RankingScoreBreakdown,
  RankingWeightRow,
} from "./types";
import { isMarketplaceContentQualityEnabled } from "@/lib/marketplace-content-quality/flags";
import { weightsByGroup } from "./ranking-weights";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Отлично";
  if (score >= 70) return "Хорошо";
  if (score >= 50) return "Средне";
  return "Низко";
}

function factorScores(input: RankingProductInput): Record<string, number> {
  const ctr = input.views > 0 ? Math.min(100, (input.favoritesCount / input.views) * 400) : 40;
  const conversion =
    input.views > 0 ? Math.min(100, (input.ordersCount / input.views) * 500) : 45;
  const useContentQuality =
    isMarketplaceContentQualityEnabled() &&
    (input.photoQuality != null || input.descriptionQuality != null);

  const photoScore = useContentQuality
    ? clampScore(
        (input.photoQuality ?? 50) * 0.45 +
          (input.thumbnailQuality ?? input.photoQuality ?? 50) * 0.2 +
          (input.photoRelevance ?? input.photoQuality ?? 50) * 0.35,
      )
    : input.photoCount >= 5
      ? 95
      : input.photoCount >= 3
        ? 82
        : input.photoCount >= 1
          ? 55
          : 0;
  const descriptionScore = useContentQuality
    ? clampScore(input.descriptionQuality ?? 50)
    : input.descriptionLength >= 120
      ? 90
      : input.descriptionLength >= 40
        ? 70
        : 35;
  const seoScore = useContentQuality
    ? clampScore(input.seoQuality ?? 50)
    : input.seoTitleLength >= 20 && input.seoDescriptionLength >= 60
      ? 92
      : input.seoTitleLength >= 8 || input.seoDescriptionLength >= 30
        ? 68
        : 40;
  const categoryScore = input.categoryId ? 90 : 0;
  const inventoryScore = input.stock >= 5 ? 95 : input.stock > 0 ? 75 : 0;
  const trustScore = clampScore(input.sellerTrustScore || 50);
  const reviewsScore =
    input.sellerReviewsCount === 0
      ? 55
      : clampScore((input.sellerAverageRating / 5) * 100);
  const shippingScore =
    input.sellerCompletedOrders >= 10 ? 85 : input.sellerCompletedOrders >= 1 ? 70 : 55;
  const priceScore =
    input.compareAt && input.compareAt > input.price
      ? 88
      : input.price > 0
        ? 72
        : 0;

  return {
    photos: photoScore,
    description: descriptionScore,
    seo: seoScore,
    category: categoryScore,
    inventory: inventoryScore,
    trust: trustScore,
    reviews: reviewsScore,
    shipping: shippingScore,
    ctr: clampScore(ctr),
    conversion: clampScore(conversion),
    price: priceScore,
  };
}

export function computeRankingScore(
  input: RankingProductInput,
  weights: RankingWeightRow[],
): RankingScoreBreakdown {
  const scores = factorScores(input);
  const factors: RankingFactorScore[] = weights.map((w) => ({
    factorKey: w.factorKey,
    groupKey: w.groupKey,
    label: w.label,
    weightPercent: w.weightPercent,
    score: clampScore(scores[w.factorKey] ?? 50),
    maxScore: 100,
  }));

  const weighted =
    factors.reduce((sum, f) => sum + f.score * f.weightPercent, 0) /
    Math.max(1, factors.reduce((sum, f) => sum + f.weightPercent, 0));

  const grouped = weightsByGroup(weights);
  const groupAverage = (keys: RankingWeightRow[]) => {
    const subset = factors.filter((f) => keys.some((k) => k.factorKey === f.factorKey));
    if (subset.length === 0) return 0;
    return clampScore(subset.reduce((s, f) => s + f.score, 0) / subset.length);
  };

  const overall = clampScore(weighted);
  return {
    overall,
    label: scoreLabel(overall),
    product: groupAverage(grouped.product),
    seller: groupAverage(grouped.seller),
    behaviour: groupAverage(grouped.behaviour),
    commercial: groupAverage(grouped.commercial),
    factors,
  };
}

export function applySimulationToInput(
  input: RankingProductInput,
  changes: {
    addVideo?: boolean;
    improveFirstPhoto?: boolean;
    reducePricePercent?: number;
  },
): RankingProductInput {
  const next = { ...input };
  if (changes.addVideo) next.hasVideo = true;
  if (changes.improveFirstPhoto) next.photoCount = Math.max(next.photoCount, 5);
  if (changes.reducePricePercent && changes.reducePricePercent > 0) {
    next.price = Math.round(next.price * (1 - changes.reducePricePercent / 100));
    next.compareAt = input.price;
  }
  if (next.hasVideo && !changes.improveFirstPhoto) {
    next.photoCount = Math.max(next.photoCount, 4);
  }
  return next;
}
