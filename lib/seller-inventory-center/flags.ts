export function isSellerInventoryCenterEnabled(): boolean {
  return process.env.SELLER_INVENTORY_CENTER_ENABLED !== "false";
}
