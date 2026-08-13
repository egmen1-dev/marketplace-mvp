export { isSellerPromotionCenterEnabled } from "./flags";
export {
  getAdminPromotionControlExtension,
  getPromotionCenterNotifications,
  getSellerPromotionCenterDashboard,
} from "./queries";
export {
  assertAdminPromotionControlAccess,
  assertSellerPromotionCenterAccess,
  SellerPromotionCenterForbiddenError,
} from "./permissions";
export { buildSummaryFromRows, emptySummary, SUMMARY_PERIOD_DAYS } from "./dashboard";
export { buildCampaignCards } from "./campaigns";
export {
  buildAnalyticsDetail,
  buildCampaignComparison,
  formatCtrDisplay,
  formatRoiDisplay,
} from "./performance";
export { enrichOpportunities, mapRecommendationToOpportunity } from "./recommendations";
export { buildSmartBudgetRecommendation } from "./budget";
export { buildPromotionAiAdvice, lowPerformanceCampaigns } from "./insights";
export type {
  AdminPromotionControlExtension,
  AdminSellerPromotionRow,
  CampaignComparisonRow,
  PromotionAiAdvice,
  PromotionCampaignCard,
  PromotionCenterNotification,
  PromotionCenterSummary,
  PromotionProductOpportunity,
  SellerPromotionCenterDashboard,
  SmartBudgetRecommendation,
} from "./types";
