/** Default OFF — AI business assistant on /account/business. */
export function isSellerBusinessIntelligenceEnabled(): boolean {
  return process.env.SELLER_BUSINESS_INTELLIGENCE_ENABLED === "true";
}
