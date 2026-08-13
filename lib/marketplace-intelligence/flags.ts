/** Default OFF — central marketplace advisory intelligence. */
export function isMarketplaceIntelligenceEnabled(): boolean {
  return process.env.MARKETPLACE_INTELLIGENCE_ENABLED === "true";
}
