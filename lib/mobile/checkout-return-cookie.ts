/** Cookie bridging mobile checkout handoff → web payment → return deep link. */

export const MOBILE_RETURN_COOKIE = "lot_mobile_return";

export function buildMobileOrderReturnDeepLink(orderId: string): string {
  return `lot://order/${orderId}`;
}

export function buildMobileOrdersReturnDeepLink(): string {
  return "lot://orders";
}
