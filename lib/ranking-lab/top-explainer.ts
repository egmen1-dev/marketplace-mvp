import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import { computeFactorContributions } from "./factor-analysis";
import type { LabTopExplanation } from "./types";

const STRENGTH_THRESHOLDS: Record<string, { high: string; low: string }> = {
  ctr: { high: "CTR выше среднего", low: "CTR ниже среднего" },
  conversion: { high: "Высокая конверсия", low: "Низкая конверсия" },
  trust: { high: "Очень хороший Trust", low: "Trust ниже нормы" },
  reviews: { high: "Отличные отзывы", low: "Слабые отзывы" },
  photos: { high: "Достаточно фото", low: "Мало фото" },
  seo: { high: "SEO в норме", low: "Не хватает SEO" },
  shipping: { high: "Отличная доставка", low: "Медленная отправка" },
  price: { high: "Конкурентная цена", low: "Цена выше рынка" },
  description: { high: "Полное описание", low: "Короткое описание" },
};

export function explainTopPosition(input: {
  product: RankingProductInput;
  position: number;
}): LabTopExplanation {
  const contributions = computeFactorContributions(input.product);
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (input.product.hasVideo) strengths.push("Есть видео");

  for (const c of contributions) {
    const labels = STRENGTH_THRESHOLDS[c.factorKey];
    if (!labels) continue;
    if (c.points >= 2) strengths.push(labels.high);
    else if (c.points <= -1) weaknesses.push(labels.low);
  }

  if (input.product.promotionActive) strengths.push("Активное продвижение");

  const headline = `Почему №${input.position}?`;

  return {
    productId: input.product.id,
    productName: input.product.name,
    position: input.position,
    headline,
    strengths: [...new Set(strengths)].slice(0, 6),
    weaknesses: [...new Set(weaknesses)].slice(0, 4),
    factorSummary: contributions.slice(0, 8),
  };
}

export function explainTop10Product(
  ranked: Array<{ product: RankingProductInput; position: number }>,
  productId: string,
): LabTopExplanation | null {
  const row = ranked.find((r) => r.product.id === productId);
  if (!row) return null;
  return explainTopPosition(row);
}
