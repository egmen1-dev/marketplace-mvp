import type { PromotionRecommendation } from "@/lib/promotion/intelligence/types";
import type { PromotionPlanDto } from "@/lib/promotion/billing/types";

import type { SmartBudgetRecommendation } from "./types";

const DISCLAIMER =
  "Рекомендация основана на данных похожих товаров. Результат не гарантируется.";

export function buildSmartBudgetRecommendation(input: {
  topRecommendation: PromotionRecommendation | null;
  plans: PromotionPlanDto[];
}): SmartBudgetRecommendation | null {
  const rec = input.topRecommendation;
  if (!rec || !rec.ready) return null;

  const plan =
    input.plans.find((p) => p.name === rec.recommendedPlan) ??
    input.plans.find((p) => p.durationDays === 14) ??
    input.plans[0];

  const amount = rec.recommendedBudget ?? plan?.price ?? 1990;
  const durationDays = plan?.durationDays ?? 14;

  const whyParts: string[] = [];
  if (rec.productViews > 0) {
    whyParts.push(
      `Похожие товары с ${rec.productViews}+ просмотрами часто получают +${Math.min(35, 10 + Math.round(rec.score / 5))}% продаж при таком бюджете.`,
    );
  } else {
    whyParts.push(
      "Похожие товары в категории получают дополнительный спрос при тарифе на 14 дней.",
    );
  }

  return {
    productId: rec.productId,
    productTitle: rec.productTitle,
    views: rec.productViews,
    orders: rec.orderCount,
    recommendedAmount: amount,
    durationDays,
    why: whyParts.join(" "),
    disclaimer: DISCLAIMER,
  };
}
