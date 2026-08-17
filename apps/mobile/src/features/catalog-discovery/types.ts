export type CatalogSort = "popular" | "newest" | "price_asc" | "price_desc";

export type QuickFilterId = "all" | "newest" | "popular" | "deals" | "in_stock";

export const CATALOG_SORT_OPTIONS: Array<{ id: CatalogSort; label: string }> = [
  { id: "popular", label: "Популярные" },
  { id: "newest", label: "Новинки" },
  { id: "price_asc", label: "Сначала дешевле" },
  { id: "price_desc", label: "Сначала дороже" },
];

export const QUICK_FILTER_OPTIONS: Array<{ id: QuickFilterId; label: string }> = [
  { id: "all", label: "Все" },
  { id: "newest", label: "Новинки" },
  { id: "popular", label: "Популярное" },
  { id: "deals", label: "Скидки" },
  { id: "in_stock", label: "В наличии" },
];

export type ProductSuggestItem = {
  type: string;
  id: string;
  title: string;
  slug: string;
};

export function sortLabel(sort: CatalogSort): string {
  return CATALOG_SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "Популярные";
}

export function resolveCatalogQuery(input: {
  quickFilter: QuickFilterId;
  sort: CatalogSort;
}): { sort: CatalogSort; inStock?: boolean; dealsOnly: boolean } {
  if (input.quickFilter === "newest") return { sort: "newest", dealsOnly: false };
  if (input.quickFilter === "popular") return { sort: "popular", dealsOnly: false };
  if (input.quickFilter === "deals") return { sort: input.sort, dealsOnly: true };
  if (input.quickFilter === "in_stock") return { sort: input.sort, inStock: true, dealsOnly: false };
  return { sort: input.sort, dealsOnly: false };
}
