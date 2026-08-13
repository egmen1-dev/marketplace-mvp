import { buildPromotionPerformanceSummary, sumPromotionMetrics } from "@/lib/promotion/analytics/score";
import type { PromotionMetricTotals } from "@/lib/promotion/analytics/types";
import { EMPTY_METRIC_TOTALS } from "@/lib/promotion/analytics/types";
import type { SellerPromotionRow } from "@/lib/promotion/types";

import type { PromotionCenterSummary } from "./types";

export const SUMMARY_PERIOD_DAYS = 30;

export function emptySummary(): PromotionCenterSummary {
  return {
    periodLabel: `Продвижение за ${SUMMARY_PERIOD_DAYS} дней`,
    activeCampaigns: 0,
    spend: 0,
    impressions: 0,
    clicks: 0,
    orders: 0,
    revenue: 0,
    roiPercent: null,
    roiLabel: "Нет данных по ROI",
  };
}

export function buildSummaryFromRows(rows: SellerPromotionRow[]): PromotionCenterSummary {
  const activeCampaigns = rows.filter((r) => r.isPromoted).length;
  const totalsList: PromotionMetricTotals[] = rows
    .map((r) => r.performance)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      impressions: p.impressions,
      clicks: p.clicks,
      productViews: p.productViews,
      addToCart: p.addToCart,
      checkoutStarted: p.checkoutStarted,
      orders: p.orders,
      revenue: p.revenue,
    }));

  const totals = totalsList.length > 0 ? sumPromotionMetrics(totalsList) : { ...EMPTY_METRIC_TOTALS };
  const spend = rows.reduce(
    (sum, row) => sum + (row.performance?.promotionCost ?? row.activeOrder?.amount ?? 0),
    0,
  );

  const summary = buildPromotionPerformanceSummary({ totals, promotionCost: spend });

  return {
    periodLabel: `Продвижение за ${SUMMARY_PERIOD_DAYS} дней`,
    activeCampaigns,
    spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    orders: totals.orders,
    revenue: totals.revenue,
    roiPercent: summary.roiPercent,
    roiLabel:
      summary.roiPercent != null
        ? `ROI +${Math.round(summary.roiPercent)}%`
        : summary.roiLabel,
  };
}
