/** Default OFF — first seller experience / «Старт продавца». */
export function isSellerFirstEntryEnabled(): boolean {
  return process.env.SELLER_FIRST_ENTRY_ENABLED === "true";
}
