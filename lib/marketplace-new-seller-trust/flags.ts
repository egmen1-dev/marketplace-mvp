/** Default OFF — transparent trust path for new sellers and first buyers. */
export function isMarketplaceNewSellerTrustEnabled(): boolean {
  return process.env.MARKETPLACE_NEW_SELLER_TRUST_ENABLED === "true";
}
