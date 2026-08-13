/** Default OFF — unified Marketplace AI OS presentation layer. */
export function isMarketplaceCommandCenterEnabled(): boolean {
  return process.env.MARKETPLACE_COMMAND_CENTER_ENABLED === "true";
}
