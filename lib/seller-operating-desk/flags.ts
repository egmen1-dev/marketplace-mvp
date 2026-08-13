/** Default OFF — unified seller business workspace «Мой бизнес». */
export function isSellerOperatingDeskEnabled(): boolean {
  return process.env.SELLER_OPERATING_DESK_ENABLED === "true";
}
