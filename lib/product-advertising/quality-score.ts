/**
 * Card quality score 0–100 for ad readiness recommendations.
 * Does not affect search ranking or catalog sort.
 */

export type CardQualityInput = {
  imageCount: number;
  titleLength: number;
  hasCategory: boolean;
  hasProductType: boolean;
  characteristicCount: number;
  requiredCharacteristicCount: number;
  filledRequiredCharacteristicCount: number;
  descriptionLength: number;
  stock: number;
  sellerVerified: boolean;
  sellerBlocked: boolean;
  sellerCompletedOrders: number;
};

export type CardQualityBreakdown = {
  score: number;
  photo: number;
  title: number;
  category: number;
  characteristics: number;
  description: number;
  stock: number;
  sellerTrust: number;
};

export const CARD_QUALITY_WEIGHTS = {
  photo: 25,
  title: 20,
  category: 15,
  characteristics: 15,
  description: 10,
  stock: 10,
  sellerTrust: 5,
} as const;

function scorePhoto(imageCount: number): number {
  if (imageCount >= 3) return CARD_QUALITY_WEIGHTS.photo;
  if (imageCount >= 1) return 18;
  return 0;
}

function scoreTitle(length: number): number {
  if (length >= 24) return CARD_QUALITY_WEIGHTS.title;
  if (length >= 12) return 14;
  if (length >= 5) return 8;
  return 0;
}

function scoreCategory(hasCategory: boolean, hasProductType: boolean): number {
  if (hasCategory && hasProductType) return CARD_QUALITY_WEIGHTS.category;
  if (hasCategory || hasProductType) return 10;
  return 0;
}

function scoreCharacteristics(
  filledRequired: number,
  requiredTotal: number,
  totalCount: number,
): number {
  if (requiredTotal > 0) {
    const ratio = filledRequired / requiredTotal;
    return Math.round(CARD_QUALITY_WEIGHTS.characteristics * ratio);
  }
  if (totalCount >= 4) return CARD_QUALITY_WEIGHTS.characteristics;
  if (totalCount >= 2) return 10;
  if (totalCount >= 1) return 5;
  return 0;
}

function scoreDescription(length: number): number {
  if (length >= 120) return CARD_QUALITY_WEIGHTS.description;
  if (length >= 60) return 7;
  if (length >= 20) return 4;
  return 0;
}

function scoreStock(stock: number): number {
  if (stock >= 10) return CARD_QUALITY_WEIGHTS.stock;
  if (stock > 0) return 7;
  return 0;
}

function scoreSellerTrust(
  verified: boolean,
  blocked: boolean,
  completedOrders: number,
): number {
  if (blocked) return 0;
  if (verified) return CARD_QUALITY_WEIGHTS.sellerTrust;
  if (completedOrders >= 5) return 4;
  if (completedOrders >= 1) return 3;
  return 2;
}

export function computeCardQualityScore(
  input: CardQualityInput,
): CardQualityBreakdown {
  const photo = scorePhoto(input.imageCount);
  const title = scoreTitle(input.titleLength);
  const category = scoreCategory(input.hasCategory, input.hasProductType);
  const characteristics = scoreCharacteristics(
    input.filledRequiredCharacteristicCount,
    input.requiredCharacteristicCount,
    input.characteristicCount,
  );
  const description = scoreDescription(input.descriptionLength);
  const stock = scoreStock(input.stock);
  const sellerTrust = scoreSellerTrust(
    input.sellerVerified,
    input.sellerBlocked,
    input.sellerCompletedOrders,
  );

  const score = Math.max(
    0,
    Math.min(
      100,
      photo + title + category + characteristics + description + stock + sellerTrust,
    ),
  );

  return {
    score,
    photo,
    title,
    category,
    characteristics,
    description,
    stock,
    sellerTrust,
  };
}

export function cardQualityTier(score: number): "low" | "medium" | "high" {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}
