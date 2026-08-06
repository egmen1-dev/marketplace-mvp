/** Seller feature — cabinet UI + product mutations. */

export {
  createProductAction,
  updateProductAction,
  updateProductStockAction,
  deleteProductAction,
  archiveProductAction,
  duplicateProductAction,
  updateSellerSettingsAction,
  updateSellerOrderStatusAction,
  type CreateProductActionState,
  type UpdateProductActionState,
  type DeleteProductActionState,
  type ProductActionState,
  type SettingsActionState,
  type OrderStatusActionState,
} from "./actions";
export {
  ProductCreateForm,
  ProductForm,
  CategoryPicker,
  ProductImageUploader,
  DeleteProductButton,
  SellerNav,
  ProductStatusBadge,
  ArchiveProductButton,
  DuplicateProductButton,
  SellerSettingsForm,
  SellerOrderStatusActions,
  InventoryStatusBadge,
  StockEditor,
  SellerToastFlash,
} from "./components";
export {
  getSellerDashboardStats,
  listSellerOrders,
  updateSellerOrderStatus,
  getSellerSettings,
  updateSellerSettings,
  getPublicSellerProfile,
  SellerServiceError,
  isLowStock,
  LOW_STOCK_THRESHOLD,
} from "./queries";
export {
  canTransitionOrderStatus,
  getAllowedOrderTransitions,
  SELLER_ORDER_TRANSITIONS,
} from "./lib/order-transitions";
