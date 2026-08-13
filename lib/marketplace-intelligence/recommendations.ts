import { ROUTES } from "@/lib/constants";

import type {
  MarketplaceOpportunity,
  MarketplaceRecommendation,
  MarketplaceSignal,
  RevenueOpportunity,
} from "./types";

/** Admin-facing AI recommendations derived from signals and opportunities. */
export function generateMarketplaceRecommendations(input: {
  signals: MarketplaceSignal[];
  opportunities: MarketplaceOpportunity[];
  revenueOpportunities: RevenueOpportunity[];
}): MarketplaceRecommendation[] {
  const recs: MarketplaceRecommendation[] = [];
  let seq = 0;

  for (const opp of input.opportunities.slice(0, 4)) {
    recs.push({
      id: `rec-${seq++}`,
      title: opp.title,
      reason: opp.reason,
      action: opp.recommendedAction,
      impact: opp.impact,
      href:
        opp.signalTypes.includes("PRODUCT_GAP") ||
        opp.signalTypes.includes("CATEGORY_TREND")
          ? ROUTES.ADMIN_CATEGORIES
          : opp.signalTypes.includes("PROMOTION_OPPORTUNITY")
            ? ROUTES.ADMIN_PROMOTIONS
            : ROUTES.ADMIN_INTELLIGENCE,
    });
  }

  const revenue = input.revenueOpportunities[0];
  if (revenue) {
    recs.push({
      id: `rec-${seq++}`,
      title: revenue.title,
      reason: revenue.forecast,
      action: "Сфокусировать продавцов на качестве карточек (advisory)",
      impact: revenue.potentialLiftPct >= 12 ? "HIGH" : "MEDIUM",
      href: ROUTES.ADMIN_CONVERSION,
    });
  }

  const demand = input.signals.find(
    (s) => s.type === "BUYER_DEMAND" && s.severity !== "LOW",
  );
  if (demand) {
    recs.push({
      id: `rec-${seq++}`,
      title: "Спрос покупателей",
      reason: demand.message,
      action: "Расширить ассортимент под популярные запросы",
      impact: demand.severity === "HIGH" ? "HIGH" : "MEDIUM",
      href: ROUTES.ADMIN_BUYERS,
    });
  }

  return recs.slice(0, 6);
}
