/** Default OFF — full seller/buyer trust score UX layer. Requires trust score model. */
export function isMarketplaceTrustExperienceEnabled(): boolean {
  return process.env.MARKETPLACE_TRUST_EXPERIENCE_ENABLED === "true";
}
