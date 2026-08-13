import { unstable_cache } from "next/cache";

import {
  getMarketplaceStats,
  listRootCategories,
} from "@/features/catalog";
import { listProducts } from "@/features/products";

/** Cached homepage catalog slices — cuts TTFB without changing UI. */
export const getHomeRootCategories = unstable_cache(
  async () => listRootCategories({ activeOnly: true }),
  ["home-root-categories"],
  { revalidate: 60 },
);

export const getHomePopularProducts = unstable_cache(
  async () =>
    listProducts({
      status: "ACTIVE",
      pageSize: 8,
      page: 1,
      sort: "popular",
    }),
  ["home-popular-products"],
  { revalidate: 60 },
);

export const getHomeNewProducts = unstable_cache(
  async () =>
    listProducts({
      status: "ACTIVE",
      pageSize: 8,
      page: 1,
      sort: "newest",
    }),
  ["home-new-products"],
  { revalidate: 60 },
);

export const getHomeMarketplaceStats = unstable_cache(
  async () => getMarketplaceStats(),
  ["home-marketplace-stats"],
  { revalidate: 60 },
);
