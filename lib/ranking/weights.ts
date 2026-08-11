/**
 * LOT Ranking v1 — centralized, versioned weight configuration.
 *
 * These are NOT Wildberries weights. WB's exact hidden formula is unknown; this
 * is our own marketplace-principled algorithm. Weights live here so they can be
 * tuned, A/B tested, and rolled back via `RANKING_VERSION`.
 */

export const RANKING_VERSION = "lot-ranking-v1" as const;

export type RankingWeights = {
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

/** Section 37 initial weights (organic signals; promotion is applied separately). */
export const LOT_RANKING_V1_WEIGHTS: RankingWeights = {
  text: 0.3,
  commercial: 0.2,
  trust: 0.15,
  conversion: 0.1,
  price: 0.08,
  logistics: 0.08,
  content: 0.04,
  stock: 0.03,
  freshness: 0.02,
};

/** Bayesian priors / smoothing so cold-start products are not destroyed. */
export const RANKING_PRIORS = {
  /** Buyout-rate Beta prior (neutral 0.5). */
  buyoutAlpha: 2,
  buyoutBeta: 2,
  /** Conversion Beta prior (neutral, slightly pessimistic like real funnels). */
  conversionAlpha: 1,
  conversionBeta: 19, // prior mean 5%
  /** Rating prior — global mean rating and its equivalent sample size. */
  ratingGlobalMean: 4.0,
  ratingPriorCount: 5,
  /** Sales volume normalization cap (log-scaled). */
  salesLogCap: 200,
  /** Conversion normalization cap (rate mapped 0..cap → 0..1). */
  conversionCap: 0.15,
  /** Freshness half-life in days. */
  freshnessHalfLifeDays: 21,
  /** Sales time-decay half-life in days. */
  salesHalfLifeDays: 45,
} as const;

export function assertWeightsSumToOne(w: RankingWeights): void {
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-6) {
    throw new Error(`Ranking weights must sum to 1, got ${sum}`);
  }
}
