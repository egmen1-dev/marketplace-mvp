import type {
  PromotionOpportunityBreakdown,
  RecommendedPlanCode,
} from "@/lib/promotion/intelligence/types";

/** Weighted factors — advisory only, does not affect search ranking. */
export const OPPORTUNITY_WEIGHTS = {
  quality: 20,
  conversion: 25,
  stock: 15,
  priceCompetitiveness: 15,
  sellerTrust: 10,
  historicalSales: 15,
} as const;

export type PromotionOpportunityInput = {
  qualityScore: number;
  productViews: number;
  addToCart: number;
  orderCount: number;
  stock: number;
  priceRatio: number | null;
  sellerVerified: boolean;
  sellerBlocked: boolean;
  sellerRating: number;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function scoreQuality(qualityScore: number): number {
  return clamp((qualityScore / 100) * OPPORTUNITY_WEIGHTS.quality);
}

function scoreConversion(
  productViews: number,
  addToCart: number,
  orderCount: number,
): number {
  if (productViews > 0 && addToCart > 0) {
    const rate = (addToCart / productViews) * 100;
    return clamp((Math.min(rate, 25) / 25) * OPPORTUNITY_WEIGHTS.conversion);
  }
  if (productViews > 0 && orderCount > 0) {
    const rate = (orderCount / productViews) * 100;
    return clamp((Math.min(rate * 4, 25) / 25) * OPPORTUNITY_WEIGHTS.conversion);
  }
  if (productViews >= 50) {
    return OPPORTUNITY_WEIGHTS.conversion * 0.35;
  }
  if (productViews >= 10) {
    return OPPORTUNITY_WEIGHTS.conversion * 0.2;
  }
  return OPPORTUNITY_WEIGHTS.conversion * 0.05;
}

function scoreStock(stock: number): number {
  if (stock <= 0) return 0;
  if (stock >= 10) return OPPORTUNITY_WEIGHTS.stock;
  if (stock >= 5) return OPPORTUNITY_WEIGHTS.stock * 0.85;
  if (stock >= 2) return OPPORTUNITY_WEIGHTS.stock * 0.65;
  return OPPORTUNITY_WEIGHTS.stock * 0.4;
}

function scorePriceCompetitiveness(priceRatio: number | null): number {
  if (priceRatio == null || !Number.isFinite(priceRatio)) {
    return OPPORTUNITY_WEIGHTS.priceCompetitiveness * 0.5;
  }
  if (priceRatio <= 0.9) return OPPORTUNITY_WEIGHTS.priceCompetitiveness;
  if (priceRatio <= 1) return OPPORTUNITY_WEIGHTS.priceCompetitiveness * 0.85;
  if (priceRatio <= 1.15) return OPPORTUNITY_WEIGHTS.priceCompetitiveness * 0.55;
  return OPPORTUNITY_WEIGHTS.priceCompetitiveness * 0.25;
}

function scoreSellerTrust(input: PromotionOpportunityInput): number {
  if (input.sellerBlocked) return 0;
  let points = OPPORTUNITY_WEIGHTS.sellerTrust * 0.5;
  if (input.sellerVerified) points += OPPORTUNITY_WEIGHTS.sellerTrust * 0.35;
  if (input.sellerRating >= 4) points += OPPORTUNITY_WEIGHTS.sellerTrust * 0.15;
  return clamp(points, 0, OPPORTUNITY_WEIGHTS.sellerTrust);
}

function scoreHistoricalSales(orderCount: number): number {
  if (orderCount >= 10) return OPPORTUNITY_WEIGHTS.historicalSales;
  if (orderCount >= 5) return OPPORTUNITY_WEIGHTS.historicalSales * 0.85;
  if (orderCount >= 1) return OPPORTUNITY_WEIGHTS.historicalSales * 0.6;
  return OPPORTUNITY_WEIGHTS.historicalSales * 0.15;
}

export function calculatePromotionOpportunityBreakdown(
  input: PromotionOpportunityInput,
): PromotionOpportunityBreakdown {
  return {
    quality: Math.round(scoreQuality(input.qualityScore) * 10) / 10,
    conversion: Math.round(scoreConversion(input.productViews, input.addToCart, input.orderCount) * 10) / 10,
    stock: Math.round(scoreStock(input.stock) * 10) / 10,
    priceCompetitiveness: Math.round(scorePriceCompetitiveness(input.priceRatio) * 10) / 10,
    sellerTrust: Math.round(scoreSellerTrust(input) * 10) / 10,
    historicalSales: Math.round(scoreHistoricalSales(input.orderCount) * 10) / 10,
  };
}

/** PromotionOpportunityScore 0–100 — recommendation layer only. */
export function calculatePromotionOpportunityScore(
  input: PromotionOpportunityInput,
): number {
  const breakdown = calculatePromotionOpportunityBreakdown(input);
  const total =
    breakdown.quality +
    breakdown.conversion +
    breakdown.stock +
    breakdown.priceCompetitiveness +
    breakdown.sellerTrust +
    breakdown.historicalSales;
  return Math.round(clamp(total));
}

export function resolveRecommendedPlan(
  score: number,
  ready: boolean,
): RecommendedPlanCode | null {
  if (!ready || score < 50) return null;
  if (score >= 80) return "BOOST";
  return "GROWTH";
}

export function resolveRecommendationLabel(
  score: number,
  ready: boolean,
): string {
  if (!ready) return "Не рекомендуем запускать рекламу";
  if (score >= 50) return "Рекомендуется продвижение";
  return "Низкий потенциал продвижения";
}
