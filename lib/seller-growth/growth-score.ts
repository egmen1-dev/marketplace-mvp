import type {
  SellerGrowthBreakdown,
  SellerGrowthLevel,
} from "@/lib/seller-growth/types";

/** Weighted factors — advisory only, no ranking impact. */
export const GROWTH_WEIGHTS = {
  productQuality: 20,
  catalogCompleteness: 15,
  conversionRate: 20,
  promotionUsage: 10,
  salesVelocity: 15,
  customerTrust: 10,
  inventoryHealth: 10,
} as const;

export type SellerGrowthInput = {
  avgQualityScore: number;
  catalogCompletenessRatio: number;
  conversionRate: number;
  promotionUsageRatio: number;
  salesVelocityScore: number;
  customerTrustScore: number;
  inventoryHealthRatio: number;
};

function clampRatio(ratio: number): number {
  return Math.min(1, Math.max(0, ratio));
}

function scoreRatio(ratio: number, weight: number): number {
  return clampRatio(ratio) * weight;
}

export function calculateGrowthBreakdown(
  input: SellerGrowthInput,
): SellerGrowthBreakdown {
  return {
    productQuality: Math.round(
      scoreRatio(input.avgQualityScore / 100, GROWTH_WEIGHTS.productQuality) *
        10,
    ) / 10,
    catalogCompleteness: Math.round(
      scoreRatio(
        input.catalogCompletenessRatio,
        GROWTH_WEIGHTS.catalogCompleteness,
      ) * 10,
    ) / 10,
    conversionRate: Math.round(
      scoreRatio(input.conversionRate / 100, GROWTH_WEIGHTS.conversionRate) * 10,
    ) / 10,
    promotionUsage: Math.round(
      scoreRatio(input.promotionUsageRatio, GROWTH_WEIGHTS.promotionUsage) * 10,
    ) / 10,
    salesVelocity: Math.round(
      scoreRatio(input.salesVelocityScore / 100, GROWTH_WEIGHTS.salesVelocity) *
        10,
    ) / 10,
    customerTrust: Math.round(
      scoreRatio(input.customerTrustScore / 100, GROWTH_WEIGHTS.customerTrust) *
        10,
    ) / 10,
    inventoryHealth: Math.round(
      scoreRatio(input.inventoryHealthRatio, GROWTH_WEIGHTS.inventoryHealth) *
        10,
    ) / 10,
  };
}

export function calculateSellerGrowthScore(
  input: SellerGrowthInput,
): number {
  const b = calculateGrowthBreakdown(input);
  return Math.round(
    b.productQuality +
      b.catalogCompleteness +
      b.conversionRate +
      b.promotionUsage +
      b.salesVelocity +
      b.customerTrust +
      b.inventoryHealth,
  );
}

export function resolveGrowthLevel(score: number): SellerGrowthLevel {
  if (score >= 80) return "STRONG";
  if (score >= 50) return "GROWING";
  return "NEEDS_ATTENTION";
}

export function growthLevelLabel(level: SellerGrowthLevel): string {
  switch (level) {
    case "STRONG":
      return "Сильный продавец";
    case "GROWING":
      return "Вы растущий продавец";
    case "NEEDS_ATTENTION":
      return "Нужно внимание к росту";
  }
}

export function buildStrengthsWeaknesses(
  breakdown: SellerGrowthBreakdown,
): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (breakdown.conversionRate >= GROWTH_WEIGHTS.conversionRate * 0.7) {
    strengths.push("Высокая конверсия");
  } else if (breakdown.conversionRate < GROWTH_WEIGHTS.conversionRate * 0.35) {
    weaknesses.push("Низкая конверсия");
  }

  if (breakdown.productQuality >= GROWTH_WEIGHTS.productQuality * 0.7) {
    strengths.push("Хорошие карточки");
  } else {
    weaknesses.push("Слабое качество карточек");
  }

  if (breakdown.catalogCompleteness >= GROWTH_WEIGHTS.catalogCompleteness * 0.6) {
    strengths.push("Широкий ассортимент");
  } else {
    weaknesses.push("Мало товаров");
  }

  if (breakdown.promotionUsage >= GROWTH_WEIGHTS.promotionUsage * 0.5) {
    strengths.push("Используете продвижение");
  } else {
    weaknesses.push("Нет продвижения");
  }

  if (breakdown.inventoryHealth < GROWTH_WEIGHTS.inventoryHealth * 0.5) {
    weaknesses.push("Проблемы с остатками");
  }

  if (breakdown.customerTrust >= GROWTH_WEIGHTS.customerTrust * 0.7) {
    strengths.push("Высокое доверие покупателей");
  } else {
    weaknesses.push("Низкое доверие");
  }

  if (breakdown.salesVelocity >= GROWTH_WEIGHTS.salesVelocity * 0.6) {
    strengths.push("Стабильные продажи");
  } else {
    weaknesses.push("Мало продаж");
  }

  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
  };
}
