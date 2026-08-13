/** Default OFF — AI promotion recommendations (advisory only). */
export function isPromotionIntelligenceEnabled(): boolean {
  return process.env.PROMOTION_INTELLIGENCE_ENABLED === "true";
}
