/**
 * Shareable catalog URL helpers (searchParams ↔ href).
 */

import { ProductCondition } from "@prisma/client";

import type {
  CatalogFilters,
  CatalogSearchParams,
  SellerKindFilter,
} from "@/features/catalog/types";
import type { ProductSort } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";

export const CATALOG_PAGE_SIZE = 12;

export const CATALOG_SORT_OPTIONS: {
  value: ProductSort;
  label: string;
}[] = [
  { value: "popular", label: "Популярные" },
  { value: "newest", label: "Новые" },
  { value: "price_asc", label: "Цена: по возрастанию" },
  { value: "price_desc", label: "Цена: по убыванию" },
];

export const SELLER_KIND_OPTIONS: {
  value: SellerKindFilter;
  label: string;
}[] = [
  { value: "SHOP", label: "Магазин" },
  { value: "INDIVIDUAL", label: "Частный продавец" },
];

const SORT_SET = new Set<ProductSort>([
  "popular",
  "newest",
  "price_asc",
  "price_desc",
]);

export function parseCatalogSort(value?: string | null): ProductSort {
  if (value && SORT_SET.has(value as ProductSort)) {
    return value as ProductSort;
  }
  return "popular";
}

export function parseCatalogCondition(
  value?: string | null,
): ProductCondition | undefined {
  if (!value) return undefined;
  if (
    value === ProductCondition.NEW ||
    value === ProductCondition.USED ||
    value === ProductCondition.REFURBISHED
  ) {
    return value;
  }
  return undefined;
}

export function parseSellerKind(
  value?: string | null,
): SellerKindFilter | undefined {
  if (value === "SHOP" || value === "INDIVIDUAL") return value;
  return undefined;
}

export function parseOptionalNumber(value?: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function parseInStock(value?: string | null): boolean | undefined {
  if (value == null || value === "") return undefined;
  if (value === "1" || value === "true" || value === "on") return true;
  return undefined;
}

export function parseCatalogParams(
  params: CatalogSearchParams,
): CatalogFilters {
  const rootCategory = params.category?.trim() || undefined;
  const subcategory = params.subcategory?.trim() || undefined;
  return {
    q: params.q?.trim() || undefined,
    rootCategory,
    subcategory,
    category: subcategory || rootCategory,
    priceMin: parseOptionalNumber(params.priceMin),
    priceMax: parseOptionalNumber(params.priceMax),
    city: params.city?.trim() || undefined,
    seller: params.seller?.trim() || undefined,
    sellerKind: parseSellerKind(params.sellerKind),
    condition: parseCatalogCondition(params.condition),
    inStock: parseInStock(params.inStock),
    sort: parseCatalogSort(params.sort),
    page: Math.max(1, Number(params.page) || 1),
  };
}

export type CatalogHrefOpts = {
  q?: string;
  category?: string;
  subcategory?: string;
  priceMin?: number | string;
  priceMax?: number | string;
  city?: string;
  seller?: string;
  sellerKind?: string;
  condition?: string;
  inStock?: boolean | string;
  sort?: string;
  page?: number;
};

/** Build `/catalog?...` preserving shareable filters. */
export function buildCatalogHref(opts: CatalogHrefOpts = {}): string {
  const sp = new URLSearchParams();

  if (opts.q) sp.set("q", opts.q);
  if (opts.category) sp.set("category", opts.category);
  if (opts.subcategory) sp.set("subcategory", opts.subcategory);
  if (opts.priceMin != null && opts.priceMin !== "") {
    sp.set("priceMin", String(opts.priceMin));
  }
  if (opts.priceMax != null && opts.priceMax !== "") {
    sp.set("priceMax", String(opts.priceMax));
  }
  if (opts.city) sp.set("city", opts.city);
  if (opts.seller) sp.set("seller", opts.seller);
  if (opts.sellerKind) sp.set("sellerKind", opts.sellerKind);
  if (opts.condition) sp.set("condition", opts.condition);
  if (opts.inStock === true || opts.inStock === "1" || opts.inStock === "true") {
    sp.set("inStock", "1");
  }
  if (opts.sort && opts.sort !== "popular") sp.set("sort", opts.sort);
  if (opts.page && opts.page > 1) sp.set("page", String(opts.page));

  const qs = sp.toString();
  return qs ? `${ROUTES.CATALOG}?${qs}` : ROUTES.CATALOG;
}

/** Build listing href for `/catalog` or `/category/[slug]` (keeps SEO path). */
export function buildListingHref(
  pathname: string,
  opts: CatalogHrefOpts = {},
): string {
  const categoryMatch = pathname.match(/^\/category\/([^/?#]+)/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]);
    // Path owns category — keep other filters in query string.
    const withoutCategory: CatalogHrefOpts = {
      ...opts,
      category: undefined,
      subcategory: undefined,
    };
    // If user picked a different category in the form, leave the SEO path.
    if (opts.subcategory && opts.subcategory !== slug) {
      return categoryPagePathWithQuery(opts.subcategory, withoutCategory);
    }
    if (opts.category && opts.category !== slug && !opts.subcategory) {
      return categoryPagePathWithQuery(opts.category, withoutCategory);
    }
    return categoryPagePathWithQuery(slug, withoutCategory);
  }
  return buildCatalogHref(opts);
}

function categoryPagePathWithQuery(slug: string, opts: CatalogHrefOpts): string {
  const catalogHref = buildCatalogHref(opts);
  const qs = catalogHref.includes("?") ? catalogHref.split("?")[1] : "";
  const base = `${ROUTES.CATEGORY}/${encodeURIComponent(slug)}`;
  return qs ? `${base}?${qs}` : base;
}

export function catalogFiltersToHref(filters: CatalogFilters): string {
  return buildCatalogHref({
    q: filters.q,
    category: filters.rootCategory ?? filters.category,
    subcategory: filters.subcategory,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    city: filters.city,
    seller: filters.seller,
    sellerKind: filters.sellerKind,
    condition: filters.condition,
    inStock: filters.inStock,
    sort: filters.sort,
    page: filters.page,
  });
}

export function hasActiveCatalogFilters(filters: CatalogFilters): boolean {
  return Boolean(
    filters.q ||
      filters.category ||
      filters.priceMin != null ||
      filters.priceMax != null ||
      filters.city ||
      filters.seller ||
      filters.sellerKind ||
      filters.condition ||
      filters.inStock,
  );
}
