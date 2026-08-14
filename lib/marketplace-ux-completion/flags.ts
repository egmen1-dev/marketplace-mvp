export function isMarketplaceUxCompletionEnabled(): boolean {
  return process.env.MARKETPLACE_UX_COMPLETION_ENABLED === "true";
}
