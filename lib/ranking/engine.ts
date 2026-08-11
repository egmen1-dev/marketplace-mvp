/**
 * MarketplaceRankingEngine — LOT Ranking v1.
 *
 * Deterministic, explainable organic scoring from real marketplace signals with
 * Bayesian smoothing for cold start. No fake ratings/orders/conversion: callers
 * pass only real, available facts; missing signals fall back to neutral priors.
 *
 * Pipeline (section 24):
 *   text relevance → marketplace signals → normalization → organic score →
 *   promotion boost → final score.
 */

import {
  LOT_RANKING_V1_WEIGHTS,
  RANKING_PRIORS,
  RANKING_VERSION,
  type RankingWeights,
} from "./weights";

export type RankingStatsInput = {
  /** Distinct PDP views / impressions (real). */
  views: number;
  /** Paid+completed orders count (real; excludes cancelled/unpaid). */
  completedOrders: number;
  /** Units ordered in paid orders (real). */
  unitsOrdered: number;
  /** Units actually bought out / received (real). */
  unitsBoughtOut: number;
  /** Real reviews only. */
  avgRating?: number | null;
  ratingCount?: number | null;
  /** Optional precomputed conversion (else derived from orders/views). */
  conversionRate?: number | null;
};

export type RankingSellerInput = {
  rating?: number | null;
  ratingCount?: number | null;
  isVerified: boolean;
  /** 0..1 real cancellation rate, if known. */
  cancellationRate?: number | null;
};

export type RankingLogisticsInput = {
  stock: number;
  pickupAvailable: boolean;
  shippingConfigured: boolean;
};

export type RankingProductInput = {
  productId: string;
  /** 0..1 text relevance for the current query (1 = neutral for browse). */
  textRelevance: number;
  price: number;
  /** Median price of the same ProductType/segment (for comparative price score). */
  categoryMedianPrice?: number | null;
  contentQuality: number; // 0..100
  createdAt: Date;
  stats: RankingStatsInput;
  seller: RankingSellerInput;
  logistics: RankingLogisticsInput;
  /** Controlled paid promotion, 0..1 (default 0). Kept separate from organic. */
  promotionBoost?: number;
};

export type RankingBreakdown = {
  text: number;
  commercial: number;
  trust: number;
  conversion: number;
  price: number;
  logistics: number;
  content: number;
  stock: number;
  freshness: number;
};

export type RankingResult = {
  productId: string;
  organicScore: number;
  promotionBoost: number;
  finalScore: number;
  breakdown: RankingBreakdown;
  rankingVersion: string;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Beta-smoothed rate → neutral prior when little data (cold start). */
function smoothedRate(
  successes: number,
  trials: number,
  alpha: number,
  beta: number,
): number {
  const s = Math.max(0, successes);
  const t = Math.max(s, trials);
  return (s + alpha) / (t + alpha + beta);
}

/** Exponential time decay factor in [0,1] for an age in days. */
function decay(ageDays: number, halfLifeDays: number): number {
  if (ageDays <= 0) return 1;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

function ageInDays(createdAt: Date, now: Date): number {
  return Math.max(0, (now.getTime() - createdAt.getTime()) / 86_400_000);
}

function salesScore(stats: RankingStatsInput, ageDays: number): number {
  // Time-decayed completed units; log-scaled and normalized by a cap.
  const decayed =
    Math.max(0, stats.unitsBoughtOut || stats.unitsOrdered) *
    decay(ageDays, RANKING_PRIORS.salesHalfLifeDays);
  const norm = Math.log1p(decayed) / Math.log1p(RANKING_PRIORS.salesLogCap);
  return clamp01(norm);
}

function commercialScore(stats: RankingStatsInput, ageDays: number): number {
  const buyout = smoothedRate(
    stats.unitsBoughtOut,
    stats.unitsOrdered,
    RANKING_PRIORS.buyoutAlpha,
    RANKING_PRIORS.buyoutBeta,
  );
  const sales = salesScore(stats, ageDays);
  return clamp01(0.6 * sales + 0.4 * buyout);
}

function trustScore(seller: RankingSellerInput): number {
  const ratingMean =
    (Number(seller.rating ?? 0) * Number(seller.ratingCount ?? 0) +
      RANKING_PRIORS.ratingGlobalMean * RANKING_PRIORS.ratingPriorCount) /
    (Number(seller.ratingCount ?? 0) + RANKING_PRIORS.ratingPriorCount);
  const ratingComponent = clamp01(ratingMean / 5);
  const verifiedComponent = seller.isVerified ? 1 : 0.5;
  const cancellation =
    seller.cancellationRate != null
      ? clamp01(1 - seller.cancellationRate)
      : 0.75; // neutral-ish prior when unknown
  return clamp01(
    0.5 * ratingComponent + 0.3 * verifiedComponent + 0.2 * cancellation,
  );
}

function conversionScore(stats: RankingStatsInput): number {
  const raw =
    stats.conversionRate != null
      ? stats.conversionRate
      : smoothedRate(
          stats.completedOrders,
          stats.views,
          RANKING_PRIORS.conversionAlpha,
          RANKING_PRIORS.conversionBeta,
        );
  return clamp01(raw / RANKING_PRIORS.conversionCap);
}

/** Comparative price attractiveness vs same-segment median (neutral 0.5). */
function priceScore(price: number, median?: number | null): number {
  if (!median || median <= 0 || price <= 0) return 0.5;
  // price == median → 0.5; cheaper → higher; dearer → lower; bounded.
  return clamp01(0.5 + (median - price) / (2 * median));
}

function logisticsScore(l: RankingLogisticsInput): number {
  const inStock = l.stock > 0 ? 0.4 : 0;
  const pickup = l.pickupAvailable ? 0.3 : 0;
  const shipping = l.shippingConfigured ? 0.3 : 0.15; // shipping usually available
  return clamp01(inStock + pickup + shipping);
}

function freshnessScore(ageDays: number): number {
  return clamp01(decay(ageDays, RANKING_PRIORS.freshnessHalfLifeDays));
}

/**
 * Score one product. Returns organic score, promotion boost (separate), the
 * final score, and a full per-signal breakdown for /admin/ranking debug.
 */
export function scoreProduct(
  input: RankingProductInput,
  options?: { weights?: RankingWeights; now?: Date },
): RankingResult {
  const w = options?.weights ?? LOT_RANKING_V1_WEIGHTS;
  const now = options?.now ?? new Date();
  const ageDays = ageInDays(input.createdAt, now);

  const breakdown: RankingBreakdown = {
    text: clamp01(input.textRelevance),
    commercial: commercialScore(input.stats, ageDays),
    trust: trustScore(input.seller),
    conversion: conversionScore(input.stats),
    price: priceScore(input.price, input.categoryMedianPrice),
    logistics: logisticsScore(input.logistics),
    content: clamp01(input.contentQuality / 100),
    stock: input.logistics.stock > 0 ? 1 : 0,
    freshness: freshnessScore(ageDays),
  };

  const organicScore = clamp01(
    w.text * breakdown.text +
      w.commercial * breakdown.commercial +
      w.trust * breakdown.trust +
      w.conversion * breakdown.conversion +
      w.price * breakdown.price +
      w.logistics * breakdown.logistics +
      w.content * breakdown.content +
      w.stock * breakdown.stock +
      w.freshness * breakdown.freshness,
  );

  const promotionBoost = clamp01(input.promotionBoost ?? 0);
  // Out-of-stock is strongly demoted (section 33) but not hidden here.
  const stockPenalty = input.logistics.stock > 0 ? 1 : 0.25;
  const finalScore = clamp01(
    (organicScore + promotionBoost * (1 - organicScore)) * stockPenalty,
  );

  return {
    productId: input.productId,
    organicScore,
    promotionBoost,
    finalScore,
    breakdown,
    rankingVersion: RANKING_VERSION,
  };
}

/** Rank a set of products by final score (descending), deterministic. */
export function rankProducts(
  inputs: RankingProductInput[],
  options?: { weights?: RankingWeights; now?: Date },
): RankingResult[] {
  return inputs
    .map((i) => scoreProduct(i, options))
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return a.productId.localeCompare(b.productId);
    });
}
