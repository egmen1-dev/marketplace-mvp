/** Default OFF — promotion performance metrics pipeline. */
export function isPromotionAnalyticsEnabled(): boolean {
  return process.env.PROMOTION_ANALYTICS_ENABLED === "true";
}
