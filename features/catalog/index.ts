/** Catalog feature — categories + catalog UI. */

export {
  listCategories,
  listRootCategories,
  listCategoryTree,
  getCategoryBySlug,
  resolveCategoryIdsIncludingDescendants,
  getMarketplaceStats,
  type CategoryListItem,
  type CategoryTreeNode,
  type CategoryDetail,
  type MarketplaceStats,
} from "./queries";
export { categoryPagePath } from "./paths";
export {
  collectDescendantIds,
  productCountWithDescendants,
  collectAncestorIds,
  buildCategoryPath,
  buildCategoryPathLabel,
  computeCategoryLevel,
  searchCategories,
} from "./tree";
export {
  CategoryFilter,
  CatalogFiltersMobile,
  CatalogFiltersSidebar,
  CatalogSortSelect,
  CatalogBreadcrumbs,
  CatalogEmptyState,
} from "./components";
export {
  buildCatalogHref,
  buildListingHref,
  catalogFiltersToHref,
  parseCatalogParams,
  CATALOG_PAGE_SIZE,
  CATALOG_SORT_OPTIONS,
  SELLER_KIND_OPTIONS,
  hasActiveCatalogFilters,
} from "./url";
export type {
  CatalogSort,
  CatalogFilters,
  CatalogSearchParams,
  SellerKindFilter,
} from "./types";
