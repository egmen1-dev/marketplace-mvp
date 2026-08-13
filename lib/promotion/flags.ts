/**
 * Feature flag for promoted product surfaces (homepage / catalog blocks).
 * Default OFF — does not affect search ranking.
 */
export function isPromotionSurfacesEnabled(): boolean {
  return process.env.PROMOTION_SURFACES_ENABLED === "true";
}

export { isPromotionAnalyticsEnabled } from "@/lib/promotion/analytics/flags";
