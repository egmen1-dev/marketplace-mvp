import type { ProductQualityEvaluation } from "./types";

const memoryCache = new Map<string, { hash: string; evaluation: ProductQualityEvaluation }>();

export function getCachedQualityEvaluation(
  productId: string,
  contentHash: string | null,
): ProductQualityEvaluation | null {
  if (!contentHash) return null;
  const row = memoryCache.get(productId);
  if (!row || row.hash !== contentHash) return null;
  return row.evaluation;
}

export function setCachedQualityEvaluation(
  productId: string,
  contentHash: string | null,
  evaluation: ProductQualityEvaluation,
): void {
  if (!contentHash) return;
  memoryCache.set(productId, { hash: contentHash, evaluation });
}

export function clearQualityCache(productId?: string): void {
  if (productId) memoryCache.delete(productId);
  else memoryCache.clear();
}
