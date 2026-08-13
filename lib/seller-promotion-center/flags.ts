/** Default OFF — intelligent seller promotion dashboard layer. */
export function isSellerPromotionCenterEnabled(): boolean {
  return process.env.SELLER_PROMOTION_CENTER_ENABLED === "true";
}
