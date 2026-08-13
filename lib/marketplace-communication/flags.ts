/** Default OFF — growth communication prep (no auto-send). */
export function isMarketplaceCommunicationEnabled(): boolean {
  return process.env.MARKETPLACE_COMMUNICATION_ENABLED === "true";
}
