export function isMarketplaceDeliveryEnabled(): boolean {
  return process.env.MARKETPLACE_DELIVERY_ENABLED === "true";
}
