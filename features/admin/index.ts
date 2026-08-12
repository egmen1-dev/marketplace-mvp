/** Marketplace owner admin panel. */

export {
  updateUserRoleAction as changeUserRoleAction,
  updateUserRoleAction,
  setUserBlockedAction,
  setSellerBlockedAction,
  setSellerVerifiedAction,
  setProductStatusAction,
  deleteProductAdminAction as deleteAdminProductAction,
  deleteProductAdminAction,
  createCategoryAction,
  updateCategoryAction,
  setCategoryActiveAction,
  hideCategoryAction,
  showCategoryAction,
  type AdminActionState,
} from "./actions";

export {
  getAdminDashboardStats,
  getAnalyticsFunnelCounts,
  getAnalyticsMeasurementDashboard,
  listRecentUsers,
  listRecentOrders,
  listRecentUsers as getAdminRecentUsers,
  listRecentOrders as getAdminRecentOrders,
  listAdminUsers,
  listAdminSellers,
  listAdminProducts,
  listAdminOrders,
  getAdminOrderDetail,
  listAdminCategories,
  listAdminBrands,
  listAdminUnderstandingCorrections,
  logAdminAction,
  updateUserRole,
  setUserBlocked,
  setSellerBlocked,
  setSellerVerified,
  setAdminProductStatus,
  deleteOrArchiveAdminProduct,
  createAdminCategory,
  updateAdminCategory,
  AdminServiceError,
  type AdminDashboardStats,
  type AnalyticsFunnelCounts,
  type AnalyticsMeasurementDashboard,
  type ProductAnalyticsRow,
  type AdminUserRow,
  type AdminSellerRow,
  type AdminProductRow,
  type AdminOrderRow,
  type AdminOrderDetail,
  type AdminCategoryRow,
  type AdminBrandRow,
  type AdminUnderstandingCorrectionRow,
} from "./queries";

export { AdminNav } from "./components/admin-nav";
export { AdminHeader } from "./components/admin-header";
export { AdminUsersTable } from "./components/admin-users-table";
export { AdminSellersTable } from "./components/admin-sellers-table";
export { AdminProductsTable } from "./components/admin-products-table";
export { AdminCategoriesPanel } from "./components/admin-categories-panel";
export { UserRoleActions } from "./components/user-role-actions";
export { SellerAdminActions } from "./components/seller-admin-actions";
export { ProductModerationActions } from "./components/product-moderation-actions";
export { CategoryAdminPanel } from "./components/category-admin-panel";
