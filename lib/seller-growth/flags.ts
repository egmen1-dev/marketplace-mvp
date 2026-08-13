/** Default OFF — seller growth advisory intelligence. */
export function isSellerGrowthEnabled(): boolean {
  return process.env.SELLER_GROWTH_ENABLED === "true";
}
