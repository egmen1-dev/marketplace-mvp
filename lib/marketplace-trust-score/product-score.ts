import {
  NEUTRAL_FACTOR_SCORE,
  PRODUCT_FACTOR_WEIGHTS,
  PRODUCT_TRUST_USER_LABEL,
  clampTrustScore,
} from "./constants";
import type { ProductTrustScoreSnapshot } from "./types";

export type ProductTrustInput = {
  productCardScore: number;
  sellerTrustScore: number;
  averageRating: number;
  reviewsCount: number;
  deliveryScore: number;
  availabilityScore: number;
};

function reviewsFactorScore(averageRating: number, reviewsCount: number): number {
  if (reviewsCount === 0) return NEUTRAL_FACTOR_SCORE;
  return clampTrustScore((averageRating / 5) * 100);
}

export function computeProductTrustScore(input: ProductTrustInput): number {
  const factors = {
    productCard: clampTrustScore(input.productCardScore),
    sellerTrust: clampTrustScore(input.sellerTrustScore),
    reviews: reviewsFactorScore(input.averageRating, input.reviewsCount),
    delivery: clampTrustScore(input.deliveryScore),
    availability: clampTrustScore(input.availabilityScore),
  };

  const totalWeight = Object.values(PRODUCT_FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
  const sum =
    factors.productCard * PRODUCT_FACTOR_WEIGHTS.productCard +
    factors.sellerTrust * PRODUCT_FACTOR_WEIGHTS.sellerTrust +
    factors.reviews * PRODUCT_FACTOR_WEIGHTS.reviews +
    factors.delivery * PRODUCT_FACTOR_WEIGHTS.delivery +
    factors.availability * PRODUCT_FACTOR_WEIGHTS.availability;

  return clampTrustScore(sum / totalWeight);
}

export function buildProductTrustSnapshot(input: ProductTrustInput): ProductTrustScoreSnapshot {
  const productScore = computeProductTrustScore(input);
  return {
    enabled: true,
    productScore,
    productScoreLabel: PRODUCT_TRUST_USER_LABEL,
    sellerScore: input.sellerTrustScore,
    factors: [
      { name: "Карточка товара", weight: PRODUCT_FACTOR_WEIGHTS.productCard, score: clampTrustScore(input.productCardScore) },
      { name: "Рейтинг продавца", weight: PRODUCT_FACTOR_WEIGHTS.sellerTrust, score: clampTrustScore(input.sellerTrustScore) },
      { name: "Отзывы", weight: PRODUCT_FACTOR_WEIGHTS.reviews, score: reviewsFactorScore(input.averageRating, input.reviewsCount) },
      { name: "Доставка", weight: PRODUCT_FACTOR_WEIGHTS.delivery, score: clampTrustScore(input.deliveryScore) },
      { name: "Наличие", weight: PRODUCT_FACTOR_WEIGHTS.availability, score: clampTrustScore(input.availabilityScore) },
    ],
  };
}

export function deriveProductCardScore(input: {
  imageCount: number;
  hasPrimary: boolean;
  characteristicCount: number;
  descriptionLength: number;
}): number {
  let score = NEUTRAL_FACTOR_SCORE;
  if (input.hasPrimary) score += 10;
  else score -= 20;
  if (input.imageCount >= 3) score += 10;
  if (input.characteristicCount >= 3) score += 5;
  if (input.descriptionLength >= 30) score += 5;
  return clampTrustScore(score);
}

export function deriveAvailabilityScore(stock: number): number {
  if (stock <= 0) return 30;
  if (stock < 3) return 70;
  return 95;
}

export function deriveDeliveryScore(hasDelivery: boolean): number {
  return hasDelivery ? 85 : 60;
}
