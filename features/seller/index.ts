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
  DashboardEmptyState,
  DashboardKpiCards,
  DashboardQuickActions,
  DashboardRecentOrders,
  DashboardRecentProducts,
  DashboardActivity,
} from "./components";
export {
  getSellerDashboardStats,
  listSellerOrders,
  listSellerDashboardActivity,
  updateSellerOrderStatus,
  getSellerSettings,
  updateSellerSettings,
  getPublicSellerProfile,
  getPublicSellerPageData,
  SellerServiceError,
  isLowStock,
  LOW_STOCK_THRESHOLD,
} from "./queries";
export type { SellerActivityItem, PublicSellerPageData } from "./queries";
export {
  getSellerTrustProfile,
  getSellerReputationMetrics,
  resolveSellerBadges,
  getVisibleSellerMetrics,
  formatSellerKindLabel,
  formatSellerJoinedDate,
  sellerBadgeLabel,
  NEW_SELLER_DAYS,
} from "./lib/reputation";
export type {
  SellerTrustProfile,
  SellerTrustMetrics,
  SellerBadgeVariant,
  SellerMetricItem,
} from "./lib/reputation";
export {
  canTransitionOrderStatus,
  getAllowedOrderTransitions,
  SELLER_ORDER_TRANSITIONS,
} from "./lib/order-transitions";
