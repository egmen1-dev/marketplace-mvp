import { ROUTES, sellerProductEditPath } from "@/lib/constants";
import type { PromotionRecommendation } from "@/lib/promotion/intelligence/types";
import { listPatterns } from "@/lib/marketplace-learning/patterns";
import { isMarketplaceLearningEnabled } from "@/lib/marketplace-learning/flags";

import type { PromotionProductOpportunity } from "./types";

export function mapRecommendationToOpportunity(
  rec: PromotionRecommendation,
): PromotionProductOpportunity {
  const reasons = [
    ...rec.reasons.slice(0, 3),
    ...rec.timingReasons.slice(0, 2),
  ].slice(0, 4);

  if (rec.ready && rec.qualityScore >= 70) {
    reasons.unshift("✓ хорошая карточка");
  }
  if (rec.breakdown.stock >= 70) {
    reasons.unshift("✓ есть остаток");
  }

  return {
    productId: rec.productId,
    title: rec.productTitle,
    price: 0,
    currency: "RUB",
    imageUrl: null,
    qualityScore: rec.qualityScore,
    promotionScore: rec.score,
    reasons: reasons.length > 0 ? reasons : [rec.recommendation],
    ready: rec.ready,
    isPromoted: rec.isPromoted,
    recommendedBudget: rec.recommendedBudget,
    recommendedPlanLabel: rec.recommendedPlanLabel,
    recommendedPlan: rec.recommendedPlan,
    href: sellerProductEditPath(rec.productId),
  };
}

export function enrichOpportunities(input: {
  recommendations: PromotionRecommendation[];
  imageByProductId: Map<string, string | null>;
  priceByProductId: Map<string, { price: number; currency: string }>;
}): PromotionProductOpportunity[] {
  let opportunities = input.recommendations
    .filter((r) => !r.isPromoted)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((rec) => {
      const base = mapRecommendationToOpportunity(rec);
      return {
        ...base,
        imageUrl: input.imageByProductId.get(rec.productId) ?? null,
        price: input.priceByProductId.get(rec.productId)?.price ?? 0,
        currency: input.priceByProductId.get(rec.productId)?.currency ?? "RUB",
      };
    });

  if (isMarketplaceLearningEnabled()) {
    const pattern = listPatterns(1)[0];
    if (pattern && opportunities[0]) {
      opportunities = opportunities.map((opp, index) =>
        index === 0
          ? {
              ...opp,
              reasons: [...opp.reasons, `✓ ${pattern.statement.slice(0, 60)}`],
            }
          : opp,
      );
    }
  }

  return opportunities;
}

export function opportunityLaunchHref(productId: string): string {
  return `${ROUTES.ACCOUNT_PROMOTION_CENTER}?product=${productId}`;
}
