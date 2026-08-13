/** Default OFF — operational advisory layer (no auto-execution). */
export function isMarketplaceOperatorEnabled(): boolean {
  return process.env.MARKETPLACE_OPERATOR_ENABLED === "true";
}
