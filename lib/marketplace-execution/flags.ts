/** Default OFF — growth execution orchestration (human-in-the-loop). */
export function isMarketplaceExecutionEnabled(): boolean {
  return process.env.MARKETPLACE_EXECUTION_ENABLED === "true";
}
