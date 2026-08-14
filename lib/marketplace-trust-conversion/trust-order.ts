import type { PdpTrustBlockOrder } from "./types";

export function resolvePdpTrustBlockOrder(input: {
  isNewSeller: boolean;
  completedOrders: number;
}): PdpTrustBlockOrder {
  if (input.isNewSeller || input.completedOrders < 10) return "new_seller";
  return "experienced";
}

export const NEW_SELLER_BLOCK_PRIORITY = [
  "protection",
  "new-seller-status",
  "trust-path",
  "product-explanation",
] as const;

export const EXPERIENCED_BLOCK_PRIORITY = [
  "reviews",
  "trust-rating",
  "delivery-speed",
  "product-explanation",
] as const;
