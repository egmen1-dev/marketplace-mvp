/**
 * PriceOutlierDetector (AGENT-019, section 19). Compares a product price to its
 * ProductType median. A cheap price is NOT automatically fraud — low data lowers
 * confidence, and only a strong deviation raises a (reviewable) signal.
 */

export type PriceOutlierResult = {
  score: number; // 0..100
  confidence: number; // 0..100
  reason: string;
};

export function detectPriceOutlier(input: {
  price: number;
  median: number | null;
  /** Number of same-ProductType products used for the median (volatility proxy). */
  sampleSize: number;
}): PriceOutlierResult {
  const { price, median, sampleSize } = input;
  if (!median || median <= 0 || price <= 0 || sampleSize < 3) {
    return {
      score: 0,
      confidence: Math.min(30, sampleSize * 10),
      reason: "Недостаточно данных для оценки цены",
    };
  }

  const ratio = price / median;
  // Only prices well below half the median are treated as outliers.
  if (ratio >= 0.5) {
    return {
      score: 0,
      confidence: Math.min(100, sampleSize * 8),
      reason: "Цена в пределах нормы для типа товара",
    };
  }

  const score = Math.round(Math.min(100, ((0.5 - ratio) / 0.5) * 100));
  const confidence = Math.round(Math.min(100, sampleSize * 8));
  return {
    score,
    confidence,
    reason: `Цена ${Math.round(ratio * 100)}% от медианы типа товара`,
  };
}
