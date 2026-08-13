/** Default OFF — contextual guidance layer (no catalog/order/finance logic changes). */
export function isMarketplaceEducationEnabled(): boolean {
  return process.env.MARKETPLACE_EDUCATION_ENABLED === "true";
}
