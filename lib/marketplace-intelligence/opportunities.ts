import type { MarketplaceOpportunity, MarketplaceSignal } from "./types";

function impactFromSeverity(
  severity: MarketplaceSignal["severity"],
): MarketplaceOpportunity["impact"] {
  if (severity === "HIGH") return "HIGH";
  if (severity === "MEDIUM") return "MEDIUM";
  return "LOW";
}

/** Turn aggregated signals into prioritized marketplace opportunities. */
export function detectMarketplaceOpportunities(
  signals: MarketplaceSignal[],
): MarketplaceOpportunity[] {
  const opportunities: MarketplaceOpportunity[] = [];
  let seq = 0;

  const categoryTrends = signals.filter((s) => s.type === "CATEGORY_TREND");
  for (const signal of categoryTrends.slice(0, 4)) {
    if (!signal.category) continue;
    opportunities.push({
      id: `cat-${seq++}`,
      title: `Рост категории «${signal.category}»`,
      impact: impactFromSeverity(signal.severity),
      reason: signal.message,
      recommendedAction: "Привлечь продавцов категории и расширить ассортимент",
      signalTypes: ["CATEGORY_TREND"],
    });
  }

  const productGaps = signals.filter((s) => s.type === "PRODUCT_GAP");
  for (const signal of productGaps.slice(0, 3)) {
    opportunities.push({
      id: `gap-${seq++}`,
      title: signal.category
        ? `Дефицит предложений: ${signal.category}`
        : "Дефицит предложений",
      impact: impactFromSeverity(signal.severity),
      reason: signal.message,
      recommendedAction: "Привлечь продавцов категории",
      signalTypes: ["PRODUCT_GAP", "BUYER_DEMAND"],
    });
  }

  const promotion = signals.find((s) => s.type === "PROMOTION_OPPORTUNITY");
  if (promotion) {
    opportunities.push({
      id: `promo-${seq++}`,
      title: "Потенциал платного продвижения",
      impact: "MEDIUM",
      reason: promotion.message,
      recommendedAction: "Коммуникация с продавцами о готовых к продвижению SKU",
      signalTypes: ["PROMOTION_OPPORTUNITY"],
    });
  }

  const revenue = signals.filter((s) => s.type === "REVENUE_OPPORTUNITY");
  const cardQuality = revenue.find((s) =>
    s.source.includes("completeness"),
  );
  if (cardQuality?.metric && cardQuality.metric >= 20) {
    opportunities.push({
      id: `rev-${seq++}`,
      title: "Рост конверсии через качество карточек",
      impact: impactFromSeverity(cardQuality.severity),
      reason: cardQuality.message,
      recommendedAction:
        "Если улучшить карточки проблемных товаров, потенциальный рост конверсии до +15%",
      signalTypes: ["REVENUE_OPPORTUNITY"],
    });
  }

  const buyerTop = signals.find(
    (s) => s.type === "BUYER_DEMAND" && s.severity === "HIGH",
  );
  if (buyerTop) {
    opportunities.push({
      id: `demand-${seq++}`,
      title: "Спрос без достаточного предложения",
      impact: "HIGH",
      reason: buyerTop.message,
      recommendedAction: "Добавить SKU под популярные запросы",
      signalTypes: ["BUYER_DEMAND"],
    });
  }

  return opportunities
    .sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.impact] - order[b.impact];
    })
    .slice(0, 8);
}
