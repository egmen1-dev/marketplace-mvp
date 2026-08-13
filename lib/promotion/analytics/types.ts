export const PROMOTION_ATTRIBUTION_WINDOW_DAYS = 7;

export type PromotionMetricTotals = {
  impressions: number;
  clicks: number;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  orders: number;
  revenue: number;
};

export type PromotionPerformanceSummary = PromotionMetricTotals & {
  ctr: number;
  conversionRate: number;
  performanceScore: number;
  promotionCost: number;
  profit: number;
  roiPercent: number | null;
  roiLabel: string;
};

export type AdminPromotionAnalyticsSummary = PromotionMetricTotals & {
  activeCampaigns: number;
  ctr: number;
};

export type AdminPromotionBillingSummary = import("@/lib/promotion/billing/types").AdminPromotionBillingSummary;

export type AdminCampaignAnalyticsRow = {
  campaignId: string;
  productId: string;
  productTitle: string;
  sellerName: string;
  productViews: number;
  orders: number;
  impressions: number;
  clicks: number;
};

export const EMPTY_METRIC_TOTALS: PromotionMetricTotals = {
  impressions: 0,
  clicks: 0,
  productViews: 0,
  addToCart: 0,
  checkoutStarted: 0,
  orders: 0,
  revenue: 0,
};

export type MetricIncrementField = keyof Pick<
  PromotionMetricTotals,
  | "impressions"
  | "clicks"
  | "productViews"
  | "addToCart"
  | "checkoutStarted"
  | "orders"
>;
