import type { PromotionMetricTotals, PromotionPerformanceSummary } from "@/lib/promotion/analytics/types";
import { EMPTY_METRIC_TOTALS } from "@/lib/promotion/analytics/types";

/** Advisory score 0–100 — does NOT affect search ranking. */
export function calculatePromotionPerformanceScore(
  totals: PromotionMetricTotals,
): number {
  const ctr =
    totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const conversion =
    totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0;

  const ctrScore = Math.min(100, ctr * 10);
  const conversionScore = Math.min(100, conversion * 5);
  const ordersScore = Math.min(100, totals.orders * 15);

  return Math.round(ctrScore * 0.4 + conversionScore * 0.4 + ordersScore * 0.2);
}

export function buildPromotionPerformanceSummary(opts: {
  totals: PromotionMetricTotals;
  campaignBudget: number | null;
}): PromotionPerformanceSummary {
  const ctr =
    opts.totals.impressions > 0
      ? (opts.totals.clicks / opts.totals.impressions) * 100
      : 0;
  const conversionRate =
    opts.totals.clicks > 0
      ? (opts.totals.orders / opts.totals.clicks) * 100
      : 0;

  const roiLabel =
    opts.campaignBudget == null || opts.campaignBudget <= 0
      ? "Стоимость продвижения не задана"
      : opts.totals.revenue > 0
        ? `ROI ${((opts.totals.revenue / opts.campaignBudget) * 100).toFixed(0)}% (оценка)`
        : "Стоимость продвижения не задана";

  return {
    ...opts.totals,
    ctr,
    conversionRate,
    performanceScore: calculatePromotionPerformanceScore(opts.totals),
    roiLabel,
  };
}

export function sumPromotionMetrics(
  rows: PromotionMetricTotals[],
): PromotionMetricTotals {
  return rows.reduce(
    (acc, row) => ({
      impressions: acc.impressions + row.impressions,
      clicks: acc.clicks + row.clicks,
      productViews: acc.productViews + row.productViews,
      addToCart: acc.addToCart + row.addToCart,
      checkoutStarted: acc.checkoutStarted + row.checkoutStarted,
      orders: acc.orders + row.orders,
      revenue: acc.revenue + row.revenue,
    }),
    { ...EMPTY_METRIC_TOTALS },
  );
}
