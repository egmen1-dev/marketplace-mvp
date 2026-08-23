import { router } from "expo-router";

/** Buyer-facing public seller storefront (catalog filtered by seller). */
export function openSellerStorefront(sellerId: string, sellerName?: string): void {
  if (!sellerId) return;
  router.push({
    pathname: "/seller/[id]",
    params: { id: sellerId, name: sellerName ?? "Продавец" },
  });
}
