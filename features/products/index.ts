/** Products feature — queries, schemas, UI. */

export {
  listProducts,
  listProductCities,
  listProductSellers,
  listSimilarProducts,
  suggestCatalog,
  incrementProductViews,
  getProductById,
  getOwnedProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  resolveListStatusFilter,
  canViewProduct,
  ProductServiceError,
  type ProductViewer,
  type ProductSellerOption,
} from "./queries";
export {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  productSortSchema,
  suggestQuerySchema,
  type CreateProductInput,
  type UpdateProductInput,
  type ListProductsQuery,
} from "./schemas";
export {
  formatPrice,
  toPriceNumber,
  slugify,
  formatCondition,
  PRODUCT_CONDITION_LABELS,
  isNewProduct,
  isHitProduct,
  hasDiscount,
  NEW_PRODUCT_DAYS,
  HIT_VIEWS_THRESHOLD,
  HIT_FAVORITES_THRESHOLD,
} from "./mappers";
export type {
  ProductListItem,
  ProductDetail,
  ProductListFilters,
  ProductListResult,
  ProductSort,
  ProductImageDto,
  ProductCategoryDto,
  ProductSellerDto,
  ProductSuggestItem,
} from "./types";
export {
  ProductCard,
  ProductGallery,
  ProductImage,
  ProductImageFallback,
  ProductPurchasePanel,
  SimilarProducts,
} from "./components";
