/** Catalog feature types. */

import type { ProductCondition } from "@prisma/client";
import type { ProductSort } from "@/features/products/types";

export type CatalogSort = ProductSort;

export type SellerKindFilter = "SHOP" | "INDIVIDUAL";

export type CatalogSearchParams = {
  q?: string;
  category?: string;
  subcategory?: string;
  priceMin?: string;
  priceMax?: string;
  city?: string;
  seller?: string;
  sellerKind?: string;
  condition?: string;
  inStock?: string;
  sort?: string;
  page?: string;
  /** Dynamic characteristic filters arrive as `ch_<slug>=v1,v2`. */
  [key: `ch_${string}`]: string | string[] | undefined;
};

export type CatalogCharacteristicFilter = { slug: string; values: string[] };

export type CatalogFilters = {
  q?: string;
  /** Effective category slug used for product query (subcategory wins). */
  category?: string;
  /** Root category slug when hierarchical filters are used. */
  rootCategory?: string;
  subcategory?: string;
  priceMin?: number;
  priceMax?: number;
  city?: string;
  seller?: string;
  sellerKind?: SellerKindFilter;
  condition?: ProductCondition;
  inStock?: boolean;
  /** Dynamic category-specific characteristic filters (section 40). */
  characteristics?: CatalogCharacteristicFilter[];
  sort?: CatalogSort;
  page?: number;
};
