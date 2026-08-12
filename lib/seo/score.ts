/**
 * SEO quality score 0–100 — low score ⇒ noindex.
 */

export type SeoScoreInput = {
  hasTitle: boolean;
  hasDescription: boolean;
  contentLength: number;
  productCount: number;
  internalLinkCount: number;
  hasUniqueText: boolean;
  hasFacets: boolean;
};

export const SEO_INDEX_THRESHOLD = 45;

export function computeSeoScore(input: SeoScoreInput): number {
  let score = 0;
  if (input.hasTitle) score += 15;
  if (input.hasDescription) score += 15;
  if (input.contentLength >= 80) score += 15;
  else if (input.contentLength >= 40) score += 8;
  if (input.productCount >= 10) score += 20;
  else if (input.productCount >= 3) score += 12;
  else if (input.productCount >= 1) score += 6;
  if (input.internalLinkCount >= 5) score += 15;
  else if (input.internalLinkCount >= 2) score += 8;
  if (input.hasUniqueText) score += 10;
  if (input.hasFacets) score += 10;
  return Math.max(0, Math.min(100, score));
}

export function shouldIndexPage(score: number, productCount: number): boolean {
  if (productCount <= 0) return false;
  return score >= SEO_INDEX_THRESHOLD;
}
