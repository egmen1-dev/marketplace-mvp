import { listProducts } from "@/features/products";

import { enrichProductsWithReasons } from "./recommendation-context";
import type { DiscoveryFeedSection, DiscoveryProductCard } from "./types";

export async function buildDiscoverySection(input: {
  id: string;
  title: string;
  emoji: string;
  description: string;
  sort: "popular" | "newest" | "price_asc" | "price_desc";
  pageSize?: number;
  maxPrice?: number;
  href?: string;
}): Promise<DiscoveryFeedSection> {
  const result = await listProducts({
    status: "ACTIVE",
    sort: input.sort,
    page: 1,
    pageSize: input.pageSize ?? 6,
    priceMax: input.maxPrice,
    inStock: true,
  });

  const items = await enrichProductsWithReasons(result.items);

  return {
    id: input.id,
    title: input.title,
    emoji: input.emoji,
    description: input.description,
    items,
    href: input.href,
  };
}

export async function pickDailyFindCard(
  products: import("@/features/products/types").ProductListItem[],
): Promise<DiscoveryProductCard | null> {
  const candidate =
    products.find((p) => p.compareAt != null && p.compareAt > p.price) ??
    products.find((p) => p.views >= 20) ??
    products[0];
  if (!candidate) return null;
  return {
    product: candidate,
    reasons: await enrichProductsWithReasons([candidate]).then((r) => r[0]!.reasons),
  };
}
