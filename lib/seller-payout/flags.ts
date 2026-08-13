/** Default OFF — seller withdrawal & manual payout workflow. */
export function isSellerPayoutEnabled(): boolean {
  return process.env.SELLER_PAYOUT_ENABLED === "true";
}
