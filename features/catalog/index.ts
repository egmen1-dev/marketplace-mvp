/** Catalog feature — categories + catalog UI. */

export {
  listCategories,
  listRootCategories,
  listCategoryTree,
  getCategoryBySlug,
  resolveCategoryIdsIncludingDescendants,
  type CategoryListItem,
  type CategoryTreeNode,
  type CategoryDetail,
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
} from "./components";
export {
  buildCatalogHref,
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
