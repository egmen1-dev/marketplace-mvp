/** Default OFF — trust-to-conversion analytics and UX ordering layer. */
export function isMarketplaceTrustConversionEnabled(): boolean {
  return process.env.MARKETPLACE_TRUST_CONVERSION_ENABLED === "true";
}
