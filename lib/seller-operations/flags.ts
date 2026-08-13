/** Default OFF — daily seller operations workspace on /account/business. */
export function isSellerOperationsEnabled(): boolean {
  return process.env.SELLER_OPERATIONS_ENABLED === "true";
}
