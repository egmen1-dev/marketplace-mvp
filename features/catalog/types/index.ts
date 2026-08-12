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
  productType?: string;
  sort?: string;
  page?: string;
  /** Facet params: f_<slug> */
  [key: `f_${string}`]: string | undefined;
};

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
  productType?: string;
  facets?: Array<{ slug: string; value: string }>;
  sort?: CatalogSort;
  page?: number;
};
