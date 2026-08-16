import { rankProductsByScore } from "@/lib/marketplace-ranking-intelligence/calibration-100";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import type { LabSensitivityReport, LabSensitivityStep } from "./types";

type ChangeSpec = {
  key: string;
  label: string;
  apply: (p: RankingProductInput) => RankingProductInput;
};

const SENSITIVITY_PRESETS: ChangeSpec[] = [
  {
    key: "photo_plus_1",
    label: "+1 фотография",
    apply: (p) => ({ ...p, photoCount: p.photoCount + 1 }),
  },
  {
    key: "reviews_plus_10",
    label: "+10 отзывов",
    apply: (p) => ({
      ...p,
      sellerReviewsCount: p.sellerReviewsCount + 10,
      sellerAverageRating: Math.max(p.sellerAverageRating, 4.2),
    }),
  },
  {
    key: "delivery_1d",
    label: "доставка 1 день",
    apply: (p) => ({ ...p, sellerCompletedOrders: Math.max(p.sellerCompletedOrders, 30) }),
  },
  {
    key: "video",
    label: "+видео",
    apply: (p) => ({ ...p, hasVideo: true, photoCount: Math.max(p.photoCount, 4) }),
  },
  {
    key: "seo_boost",
    label: "+SEO",
    apply: (p) => ({
      ...p,
      seoTitleLength: 40,
      seoDescriptionLength: 120,
      descriptionLength: Math.max(p.descriptionLength, 140),
    }),
  },
  {
    key: "ctr_boost",
    label: "+CTR",
    apply: (p) => ({
      ...p,
      favoritesCount: Math.round(Math.max(p.views, 100) * 0.08),
    }),
  },
];

function findPosition(
  products: RankingProductInput[],
  productId: string,
): number {
  const ranked = rankProductsByScore(products, DEFAULT_RANKING_WEIGHTS_V1);
  return ranked.find((r) => r.product.id === productId)?.position ?? ranked.length;
}

export function runSensitivityLab(
  allProducts: RankingProductInput[],
  targetProductId: string,
  steps: ChangeSpec[] = SENSITIVITY_PRESETS.slice(0, 3),
): LabSensitivityReport | null {
  const target = allProducts.find((p) => p.id === targetProductId);
  if (!target) return null;

  let currentProducts = [...allProducts];
  let positionBefore = findPosition(currentProducts, targetProductId);
  const results: LabSensitivityStep[] = [];

  for (const step of steps) {
    currentProducts = currentProducts.map((p) =>
      p.id === targetProductId ? step.apply(p) : p,
    );
    const positionAfter = findPosition(currentProducts, targetProductId);
    results.push({
      change: step.label,
      changeKey: step.key,
      positionBefore,
      positionAfter,
      delta: positionBefore - positionAfter,
    });
    positionBefore = positionAfter;
  }

  return {
    productId: target.id,
    productName: target.name,
    baselinePosition: findPosition(allProducts, targetProductId),
    steps: results,
  };
}

export function pickMidTierProductId(
  ranked: Array<{ product: RankingProductInput; position: number }>,
): string | null {
  const mid = ranked.find((r) => r.position >= 120 && r.position <= 180);
  return mid?.product.id ?? ranked[Math.floor(ranked.length / 2)]?.product.id ?? null;
}

export { SENSITIVITY_PRESETS };
