export function isSellerPromotionCenterEnabled(): boolean {
  return process.env.SELLER_PROMOTION_CENTER_ENABLED !== "false";
}
