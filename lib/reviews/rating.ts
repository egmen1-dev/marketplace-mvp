/**
 * Bayesian-smoothed review rating (TASK 059, section 19).
 *
 * A raw average is unfair to low-count items: 5.0 from 1 review must not beat
 * 4.9 from 500. We shrink toward a global prior mean with an equivalent sample
 * size (a simple, documented alternative to the IMDB weighting):
 *
 *   weighted = (priorCount·globalMean + count·avg) / (priorCount + count)
 *
 * With zero reviews the result is exactly `globalMean` (neutral, not a penalty),
 * so new products/sellers are not destroyed at cold start (sections 22, 40).
 */

export const REVIEW_RATING_PRIOR = {
  /** Marketplace-wide mean rating used as the prior. */
  globalMean: 4.2,
  /** Equivalent prior sample size (how many "virtual" average reviews). */
  priorCount: 8,
} as const;

export type RatingPrior = { globalMean: number; priorCount: number };

/** Bayesian weighted rating on the 1..5 scale. */
export function bayesianRating(
  avg: number,
  count: number,
  prior: RatingPrior = REVIEW_RATING_PRIOR,
): number {
  const n = Math.max(0, count);
  const a = n > 0 ? avg : 0;
  return (prior.priorCount * prior.globalMean + n * a) / (prior.priorCount + n);
}

/** Normalized 0..1 rating signal for the ranking engine. */
export function ratingScore(
  avg: number,
  count: number,
  prior: RatingPrior = REVIEW_RATING_PRIOR,
): number {
  return Math.max(0, Math.min(1, bayesianRating(avg, count, prior) / 5));
}
