/** Default OFF — transparent seller/product trust score model. */
export function isMarketplaceTrustScoreModelEnabled(): boolean {
  return process.env.MARKETPLACE_TRUST_SCORE_MODEL_ENABLED === "true";
}
