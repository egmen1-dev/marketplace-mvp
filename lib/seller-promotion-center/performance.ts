import { buildPromotionPerformanceSummary } from "@/lib/promotion/analytics/score";
import type { SellerPromotionRow } from "@/lib/promotion/types";

import type {
  CampaignComparisonRow,
  PromotionAnalyticsDetail,
  PromotionFunnelStep,
} from "./types";

export function buildAnalyticsDetail(rows: SellerPromotionRow[]): PromotionAnalyticsDetail {
  const performances = rows
    .map((r) => r.performance)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const impressions = performances.reduce((s, p) => s + p.impressions, 0);
  const clicks = performances.reduce((s, p) => s + p.clicks, 0);
  const productViews = performances.reduce((s, p) => s + p.productViews, 0);
  const addToCart = performances.reduce((s, p) => s + p.addToCart, 0);
  const orders = performances.reduce((s, p) => s + p.orders, 0);
  const revenue = performances.reduce((s, p) => s + p.revenue, 0);
  const spend = performances.reduce((s, p) => s + p.promotionCost, 0);

  const summary = buildPromotionPerformanceSummary({
    totals: {
      impressions,
      clicks,
      productViews,
      addToCart,
      checkoutStarted: performances.reduce((s, p) => s + p.checkoutStarted, 0),
      orders,
      revenue,
    },
    promotionCost: spend,
  });

  const funnel: PromotionFunnelStep[] = [
    { label: "Показ", value: impressions },
    { label: "Клик", value: clicks },
    { label: "Карточка", value: productViews },
    { label: "Корзина", value: addToCart },
    { label: "Заказ", value: orders },
  ];

  return {
    funnel,
    metrics: {
      impressions,
      clicks,
      ctr: summary.ctr,
      conversionRate: summary.conversionRate,
      orders,
      revenue,
    },
  };
}

export function buildCampaignComparison(
  rows: SellerPromotionRow[],
  limit = 4,
): CampaignComparisonRow[] {
  return rows
    .filter((r) => r.performance && (r.performance.clicks > 0 || r.performance.impressions > 0))
    .map((r) => ({
      productId: r.productId,
      productTitle: r.title,
      ctr: r.performance!.ctr,
      roiPercent: r.performance!.roiPercent,
      roiLabel:
        r.performance!.roiPercent != null
          ? `ROI +${Math.round(r.performance!.roiPercent)}%`
          : r.performance!.roiLabel,
    }))
    .sort((a, b) => (b.roiPercent ?? 0) - (a.roiPercent ?? 0))
    .slice(0, limit);
}

export function formatRoiDisplay(roiPercent: number | null): string {
  if (roiPercent == null) return "—";
  const sign = roiPercent >= 0 ? "+" : "";
  return `${sign}${Math.round(roiPercent)}%`;
}

export function formatCtrDisplay(ctr: number): string {
  return `${(Math.round(ctr * 10) / 10).toFixed(1)}%`;
}
