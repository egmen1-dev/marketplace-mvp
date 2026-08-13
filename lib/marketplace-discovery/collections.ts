import { listProducts } from "@/features/products";

import { DISCOVERY_COLLECTIONS, getDiscoveryCollection } from "./collection-definitions";
import { isDiscoveryCollectionsEnabled } from "./flags";
import { enrichProductsWithReasons } from "./recommendation-context";
import type { DiscoveryCollectionPage } from "./types";

export { DISCOVERY_COLLECTIONS, getDiscoveryCollection } from "./collection-definitions";

export async function loadDiscoveryCollectionPage(
  slug: string,
): Promise<DiscoveryCollectionPage | null> {
  if (!isDiscoveryCollectionsEnabled()) return null;

  const collection = getDiscoveryCollection(slug);
  if (!collection) return null;

  const result = await listProducts({
    status: "ACTIVE",
    sort: collection.sort,
    page: 1,
    pageSize: 24,
    priceMax: collection.maxPrice,
    inStock: true,
  });

  const items = await enrichProductsWithReasons(result.items);

  return {
    enabled: true,
    collection,
    items,
  };
}
