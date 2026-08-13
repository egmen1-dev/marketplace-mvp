/** Default OFF — reviews, reputation, and moderation foundation. */
export function isMarketplaceTrustLoopEnabled(): boolean {
  return process.env.MARKETPLACE_TRUST_LOOP_ENABLED === "true";
}
