export { isPromotionAnalyticsEnabled } from "./flags";
export { ingestPromotionAnalyticsEvent } from "./ingest";
export {
  findActivePromotionAttribution,
  touchPromotionAttribution,
} from "./attribution";
export {
  findActiveCampaignForProduct,
  incrementPromotionMetric,
  startOfUtcDay,
} from "./metrics";
export {
  calculatePromotionPerformanceScore,
  buildPromotionPerformanceSummary,
  sumPromotionMetrics,
} from "./score";
export {
  getAdminPromotionAnalytics,
  getCampaignMetricTotals,
  getCampaignPerformanceSummary,
  getSellerCampaignPerformanceMap,
} from "./queries";
export type {
  AdminCampaignAnalyticsRow,
  AdminPromotionAnalyticsSummary,
  MetricIncrementField,
  PromotionMetricTotals,
  PromotionPerformanceSummary,
} from "./types";
export {
  EMPTY_METRIC_TOTALS,
  PROMOTION_ATTRIBUTION_WINDOW_DAYS,
} from "./types";
