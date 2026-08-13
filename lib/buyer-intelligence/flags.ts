/** Default OFF — buyer advisory intelligence (no ranking impact). */
export function isBuyerIntelligenceEnabled(): boolean {
  return process.env.BUYER_INTELLIGENCE_ENABLED === "true";
}
