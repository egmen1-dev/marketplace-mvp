import type {
  MarketplaceHealth,
  MarketplaceProblem,
  MarketplaceSignal,
  RevenueOpportunity,
} from "./types";

export function buildMarketplaceHealth(input: {
  gmv: number;
  sellers: number;
  buyers: number;
  activeProducts: number;
  orders: number;
  conversionRate: number | null;
}): MarketplaceHealth {
  return {
    gmv: input.gmv,
    sellers: input.sellers,
    buyers: input.buyers,
    conversionRate: input.conversionRate,
    activeProducts: input.activeProducts,
    orders: input.orders,
  };
}

export function buildMarketplaceProblems(
  signals: MarketplaceSignal[],
): MarketplaceProblem[] {
  const problems: MarketplaceProblem[] = [];
  let seq = 0;

  const viewsNoSales = signals.find((s) => s.source === "conversion.views_no_sales");
  if (viewsNoSales?.metric) {
    problems.push({
      id: `prob-${seq++}`,
      title: `${viewsNoSales.metric} товаров имеют просмотры, но 0 продаж`,
      severity: viewsNoSales.severity,
      detail:
        "Проверьте цены, фото и описания — возможна потеря выручки на этапе PDP.",
    });
  }

  const lowConversion = signals.find((s) => s.source === "analytics.funnel");
  if (lowConversion) {
    problems.push({
      id: `prob-${seq++}`,
      title: "Низкая конверсия в корзину",
      severity: lowConversion.severity,
      detail: lowConversion.message,
    });
  }

  const atRisk = signals.find((s) => s.source === "seller_growth.at_risk");
  if (atRisk) {
    problems.push({
      id: `prob-${seq++}`,
      title: "Продавцы под риском оттока",
      severity: atRisk.severity,
      detail: atRisk.message,
    });
  }

  const gaps = signals.filter((s) => s.type === "PRODUCT_GAP");
  for (const gap of gaps.slice(0, 2)) {
    problems.push({
      id: `prob-${seq++}`,
      title: gap.category
        ? `Нехватка предложений: ${gap.category}`
        : "Нехватка предложений",
      severity: gap.severity,
      detail: gap.message,
    });
  }

  return problems;
}

export function buildRevenueOpportunities(
  signals: MarketplaceSignal[],
): RevenueOpportunity[] {
  const opportunities: RevenueOpportunity[] = [];

  const cardQuality = signals.find((s) =>
    s.source.includes("completeness"),
  );
  if (cardQuality?.metric && cardQuality.metric >= 10) {
    const affected = Math.min(cardQuality.metric, 500);
    const lift = affected >= 100 ? 15 : affected >= 50 ? 12 : 8;
    opportunities.push({
      title: "Улучшение карточек товаров",
      forecast: `Если улучшить карточки ${affected} товаров, потенциальный рост конверсии +${lift}%`,
      affectedProducts: affected,
      potentialLiftPct: lift,
    });
  }

  const viewsNoSales = signals.find((s) => s.source === "conversion.views_no_sales");
  if (viewsNoSales?.metric && viewsNoSales.metric >= 10) {
    opportunities.push({
      title: "Конверсия просмотров в продажи",
      forecast: `Оптимизация ${Math.min(viewsNoSales.metric, 200)} SKU с просмотрами без продаж может вернуть до 10% GMV`,
      affectedProducts: viewsNoSales.metric,
      potentialLiftPct: 10,
    });
  }

  return opportunities;
}
