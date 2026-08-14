/** Default OFF — unified seller journey from activation to first payout. */
export function isSellerLifecycleEnabled(): boolean {
  return process.env.SELLER_LIFECYCLE_ENABLED === "true";
}
