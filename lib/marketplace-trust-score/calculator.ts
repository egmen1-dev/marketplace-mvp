import {
  NEUTRAL_FACTOR_SCORE,
  NEW_SELLER_TRUST_SCORE,
  SELLER_FACTOR_LABELS,
  SELLER_FACTOR_WEIGHTS,
  clampTrustScore,
  getTrustLevel,
} from "./constants";
import {
  productCardQualityAdjustments,
  verificationScore,
} from "./rules";
import type { SellerFactorScore } from "./types";

export type SellerMetricsInput = {
  products: Array<{
    imageCount: number;
    hasPrimary: boolean;
    characteristicCount: number;
    descriptionLength: number;
  }>;
  completedOrders: number;
  cancelledBySeller: number;
  problematicOrders: number;
  shippingHoursSamples: number[];
  averageReviewRating: number;
  reviewsCount: number;
  activeProducts: number;
  recentProductUpdates: number;
  phoneVerified: boolean;
  paymentVerified: boolean;
  isVerified: boolean;
};

function weightedAverage(factors: SellerFactorScore[]): number {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight === 0) return NEW_SELLER_TRUST_SCORE;
  const sum = factors.reduce((acc, f) => acc + f.score * f.weight, 0);
  return clampTrustScore(sum / totalWeight);
}

function productQualityFactor(products: SellerMetricsInput["products"]): number {
  if (products.length === 0) return NEUTRAL_FACTOR_SCORE;
  const adjustments = products.map((p) => productCardQualityAdjustments(p));
  const avgAdjustment = adjustments.reduce((a, b) => a + b, 0) / products.length;
  return clampTrustScore(NEUTRAL_FACTOR_SCORE + avgAdjustment);
}

function orderFulfillmentFactor(input: SellerMetricsInput): number {
  const total = input.completedOrders + input.cancelledBySeller + input.problematicOrders;
  if (total === 0) return NEUTRAL_FACTOR_SCORE;
  const successRate = input.completedOrders / total;
  return clampTrustScore(40 + successRate * 60);
}

function shippingSpeedFactor(samples: number[]): number {
  if (samples.length === 0) return NEUTRAL_FACTOR_SCORE;
  const avgHours = samples.reduce((a, b) => a + b, 0) / samples.length;
  if (avgHours <= 24) return 95;
  if (avgHours <= 48) return 80;
  if (avgHours <= 96) return 55;
  return 35;
}

function reviewsFactor(input: SellerMetricsInput): number {
  if (input.reviewsCount === 0) return NEUTRAL_FACTOR_SCORE;
  const ratingScore = (input.averageReviewRating / 5) * 100;
  const volumeBoost = Math.min(10, input.reviewsCount / 10);
  return clampTrustScore(ratingScore * 0.85 + volumeBoost);
}

function activityFactor(input: SellerMetricsInput): number {
  if (input.activeProducts === 0) return 50;
  let score = NEUTRAL_FACTOR_SCORE;
  if (input.recentProductUpdates > 0) score += 10;
  if (input.activeProducts >= 3) score += 5;
  return clampTrustScore(score);
}

function accountVerificationFactor(input: SellerMetricsInput): number {
  return verificationScore(input);
}

export function computeSellerFactorScores(
  metrics: SellerMetricsInput,
): SellerFactorScore[] {
  const entries: Array<[keyof typeof SELLER_FACTOR_WEIGHTS, number]> = [
    ["productQuality", productQualityFactor(metrics.products)],
    ["orderFulfillment", orderFulfillmentFactor(metrics)],
    ["shippingSpeed", shippingSpeedFactor(metrics.shippingHoursSamples)],
    ["reviews", reviewsFactor(metrics)],
    ["activity", activityFactor(metrics)],
    ["accountVerification", accountVerificationFactor(metrics)],
  ];

  return entries.map(([id, score]) => ({
    id,
    name: SELLER_FACTOR_LABELS[id],
    weight: SELLER_FACTOR_WEIGHTS[id],
    score,
  }));
}

export function computeSellerTrustScoreFromFactors(factors: SellerFactorScore[]): number {
  return weightedAverage(factors);
}

export function computeSellerTrustScore(metrics: SellerMetricsInput): {
  score: number;
  factors: SellerFactorScore[];
  level: string;
} {
  const factors = computeSellerFactorScores(metrics);
  const hasHistory =
    metrics.completedOrders > 0 ||
    metrics.reviewsCount > 0 ||
    metrics.cancelledBySeller > 0 ||
    metrics.problematicOrders > 0;

  const factorScore = computeSellerTrustScoreFromFactors(factors);
  const score = hasHistory ? factorScore : NEW_SELLER_TRUST_SCORE;
  return {
    score,
    factors,
    level: getTrustLevel(score).label,
  };
}

export function averageShippingHours(samples: number[]): number | null {
  if (samples.length === 0) return null;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

export function fulfillmentPercent(input: {
  completedOrders: number;
  cancelledBySeller: number;
  problematicOrders: number;
}): number {
  const total = input.completedOrders + input.cancelledBySeller + input.problematicOrders;
  if (total === 0) return 0;
  return Math.round((input.completedOrders / total) * 100);
}
