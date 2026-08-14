import type { SellerTrustFeedbackItem, SellerTrustFeedbackSnapshot } from "./types";

type ProductSignal = {
  productId: string;
  name: string;
  views: number;
  cartAdds: number;
  reviewsCount: number;
  imageCount: number;
  characteristicCount: number;
  isNewSeller: boolean;
};

const PROBLEM_FIX: Record<string, { problem: string; fix: string }> = {
  "no-reviews": {
    problem: "Нет отзывов",
    fix: "Получите первые отзывы",
  },
  "few-photos": {
    problem: "Мало фото",
    fix: "Добавьте фотографии",
  },
  "new-seller": {
    problem: "Новый продавец — мало истории",
    fix: "Выполните первые заказы и соберите отзывы",
  },
  "no-specs": {
    problem: "Нет информации о товаре",
    fix: "Заполните характеристики",
  },
  "low-conversion": {
    problem: "Много просмотров — мало корзин",
    fix: "Проверьте цену, фото и описание",
  },
};

function scoreProductDoubts(product: ProductSignal): Map<string, number> {
  const scores = new Map<string, number>();

  if (product.views >= 5 && product.cartAdds === 0) {
    scores.set("low-conversion", (scores.get("low-conversion") ?? 0) + product.views);
  }
  if (product.reviewsCount === 0) {
    scores.set("no-reviews", (scores.get("no-reviews") ?? 0) + Math.max(1, product.views));
  }
  if (product.imageCount < 3) {
    scores.set("few-photos", (scores.get("few-photos") ?? 0) + 1);
  }
  if (product.isNewSeller) {
    scores.set("new-seller", (scores.get("new-seller") ?? 0) + 1);
  }
  if (product.characteristicCount < 3) {
    scores.set("no-specs", (scores.get("no-specs") ?? 0) + 1);
  }

  return scores;
}

export function buildSellerTrustFeedback(products: ProductSignal[]): SellerTrustFeedbackSnapshot {
  const totals = new Map<string, number>();

  for (const product of products) {
    for (const [key, weight] of scoreProductDoubts(product)) {
      totals.set(key, (totals.get(key) ?? 0) + weight);
    }
  }

  const ranked = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const doubts: SellerTrustFeedbackItem[] = ranked.map(([key], index) => ({
    rank: index + 1,
    problem: PROBLEM_FIX[key]?.problem ?? key,
    fix: PROBLEM_FIX[key]?.fix ?? "Улучшите карточку товара",
  }));

  const fixes = [...new Set(doubts.map((d) => d.fix))].slice(0, 3);

  if (fixes.length === 0) {
    fixes.push(
      "Добавьте фотографии",
      "Получите первые отзывы",
      "Заполните характеристики",
    );
  }

  return {
    enabled: true,
    doubts,
    fixes,
  };
}

export function buildAdminTrustLossInsights(input: {
  noReviews: number;
  newSeller: number;
  slowShipping: number;
  noPhotos: number;
  noSpecs: number;
}): import("./types").TrustLossInsight[] {
  const entries = [
    { reason: "Нет отзывов", count: input.noReviews },
    { reason: "Новый продавец", count: input.newSeller },
    { reason: "Долгая отправка", count: input.slowShipping },
    { reason: "Нет фото", count: input.noPhotos },
    { reason: "Нет характеристик", count: input.noSpecs },
  ].sort((a, b) => b.count - a.count);

  const total = entries.reduce((sum, e) => sum + e.count, 0) || 1;

  return entries.slice(0, 5).map((entry, index) => ({
    rank: index + 1,
    reason: entry.reason,
    sharePercent: Math.round((entry.count / total) * 100),
  }));
}
