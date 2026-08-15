import type { RankingWeightRow } from "./types";

/** Default v1 weights — persisted to DB on first boot; editable without deploy. */
export const DEFAULT_RANKING_WEIGHTS_V1: RankingWeightRow[] = [
  { factorKey: "photos", groupKey: "product", label: "Фото", weightPercent: 15 },
  { factorKey: "description", groupKey: "product", label: "Описание", weightPercent: 8 },
  { factorKey: "seo", groupKey: "product", label: "SEO", weightPercent: 10 },
  { factorKey: "category", groupKey: "product", label: "Категория", weightPercent: 7 },
  { factorKey: "inventory", groupKey: "product", label: "Наличие", weightPercent: 5 },
  { factorKey: "trust", groupKey: "seller", label: "Доверие", weightPercent: 12 },
  { factorKey: "reviews", groupKey: "seller", label: "Отзывы", weightPercent: 8 },
  { factorKey: "shipping", groupKey: "seller", label: "Скорость отправки", weightPercent: 5 },
  { factorKey: "ctr", groupKey: "behaviour", label: "CTR", weightPercent: 18 },
  { factorKey: "conversion", groupKey: "behaviour", label: "Конверсия", weightPercent: 7 },
  { factorKey: "price", groupKey: "commercial", label: "Цена", weightPercent: 5 },
];

export function normalizeWeights(weights: RankingWeightRow[]): RankingWeightRow[] {
  const total = weights.reduce((sum, w) => sum + w.weightPercent, 0);
  if (total === 100) return weights;
  if (total === 0) return DEFAULT_RANKING_WEIGHTS_V1;
  return weights.map((w) => ({
    ...w,
    weightPercent: Math.round((w.weightPercent / total) * 100),
  }));
}

export function weightsByGroup(weights: RankingWeightRow[]) {
  return {
    product: weights.filter((w) => w.groupKey === "product"),
    seller: weights.filter((w) => w.groupKey === "seller"),
    behaviour: weights.filter((w) => w.groupKey === "behaviour"),
    commercial: weights.filter((w) => w.groupKey === "commercial"),
  };
}
