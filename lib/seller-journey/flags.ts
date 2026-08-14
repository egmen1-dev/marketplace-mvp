/** Default OFF — unified seller journey UX layer. */
export function isSellerJourneyEnabled(): boolean {
  return process.env.SELLER_JOURNEY_ENABLED === "true";
}
