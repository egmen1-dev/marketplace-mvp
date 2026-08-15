import { rankProductsByScore } from "@/lib/marketplace-ranking-intelligence/calibration-100";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import { computeFactorContributions } from "./factor-analysis";
import type { LabAdvisorAction, LabSellerAdvisorReport } from "./types";

type ActionTemplate = {
  factorKey: string;
  title: string;
  stars: 5 | 4 | 3;
  apply: (p: RankingProductInput) => RankingProductInput;
  successBase: number;
};

const ADVISOR_ACTIONS: ActionTemplate[] = [
  {
    factorKey: "photos",
    title: "Добавьте ещё 2 фотографии",
    stars: 5,
    apply: (p) => ({ ...p, photoCount: Math.max(p.photoCount + 2, 5) }),
    successBase: 89,
  },
  {
    factorKey: "reviews",
    title: "Получите ещё 4 отзыва",
    stars: 5,
    apply: (p) => ({
      ...p,
      sellerReviewsCount: p.sellerReviewsCount + 4,
      sellerAverageRating: Math.max(p.sellerAverageRating, 4.3),
    }),
    successBase: 82,
  },
  {
    factorKey: "ctr",
    title: "Увеличьте CTR карточки",
    stars: 5,
    apply: (p) => ({
      ...p,
      favoritesCount: Math.round(Math.max(p.views, 50) * 0.07),
    }),
    successBase: 78,
  },
  {
    factorKey: "seo",
    title: "Улучшите SEO заголовок и описание",
    stars: 4,
    apply: (p) => ({
      ...p,
      seoTitleLength: 36,
      seoDescriptionLength: 110,
      descriptionLength: Math.max(p.descriptionLength, 120),
    }),
    successBase: 74,
  },
  {
    factorKey: "trust",
    title: "Повысьте trust score продавца",
    stars: 4,
    apply: (p) => ({ ...p, sellerTrustScore: Math.min(95, p.sellerTrustScore + 12) }),
    successBase: 71,
  },
  {
    factorKey: "shipping",
    title: "Ускорьте отправку заказов",
    stars: 4,
    apply: (p) => ({
      ...p,
      sellerCompletedOrders: Math.max(p.sellerCompletedOrders + 8, 12),
    }),
    successBase: 68,
  },
  {
    factorKey: "conversion",
    title: "Повысьте конверсию карточки",
    stars: 3,
    apply: (p) => ({
      ...p,
      ordersCount: Math.max(p.ordersCount + 3, Math.round(p.views * 0.025)),
    }),
    successBase: 65,
  },
];

function positionOf(products: RankingProductInput[], id: string): number {
  return rankProductsByScore(products).find((r) => r.product.id === id)?.position ?? products.length;
}

export function buildSellerAdvisor(
  allProducts: RankingProductInput[],
  productId: string,
): LabSellerAdvisorReport | null {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return null;

  const baselinePosition = positionOf(allProducts, productId);
  const contributions = computeFactorContributions(product);
  const weakFactors = new Set(
    contributions.filter((c) => c.points < 0).map((c) => c.factorKey),
  );

  const actions: LabAdvisorAction[] = ADVISOR_ACTIONS.map((template) => {
    const nextProducts = allProducts.map((p) =>
      p.id === productId ? template.apply(p) : p,
    );
    const after = positionOf(nextProducts, productId);
    const gain = Math.max(0, baselinePosition - after);
    const bonus = weakFactors.has(template.factorKey) ? 8 : 0;
    return {
      title: template.title,
      stars: template.stars,
      factorKey: template.factorKey,
      expectedPositionGain: gain,
      successProbabilityPercent: Math.min(95, template.successBase + bonus),
    };
  })
    .filter((a) => a.expectedPositionGain > 0 || weakFactors.has(a.factorKey))
    .sort((a, b) => b.expectedPositionGain - a.expectedPositionGain)
    .slice(0, 5);

  return {
    productId,
    productName: product.name,
    currentPosition: baselinePosition,
    actions,
  };
}

export { ADVISOR_ACTIONS };
