export function isMarketplaceConversionEnabled(): boolean {
  return process.env.MARKETPLACE_CONVERSION_ENABLED === "true";
}
