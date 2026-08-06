/** App-wide constants (no secrets). */

export const APP_NAME = "Лот";

export const DEFAULT_CURRENCY = "RUB" as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const ROUTES = {
  HOME: "/",
  CATALOG: "/catalog",
  CATEGORIES: "/categories",
  CATEGORY: "/category",
  PRODUCT: "/product",
  CART: "/cart",
  CHECKOUT: "/checkout",
  ORDERS: "/orders",
  ACCOUNT: "/account",
  PROFILE: "/profile",
  /** Preferred cabinet route; `/profile/history` redirects here. */
  HISTORY: "/history",
  /** @deprecated Use HISTORY — kept for revalidatePath / legacy links. */
  PROFILE_HISTORY: "/history",
  FAVORITES: "/favorites",
  /** Preferred cabinet route; `/account/settings` redirects here. */
  SETTINGS: "/settings",
  ABOUT: "/about",
  SUPPORT: "/support",
  CONTACTS: "/contacts",
  SELL: "/sell",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  SELLER: "/seller",
  SELLER_DASHBOARD: "/seller/dashboard",
  SELLER_PRODUCTS: "/seller/products",
  SELLER_NEW_PRODUCT: "/seller/products/new",
  SELLER_ORDERS: "/seller/orders",
  SELLER_ANALYTICS: "/seller/analytics",
  SELLER_SETTINGS: "/seller/settings",
  /** Public storefront — append `/${idOrSlug}` */
  SELLER_PUBLIC: "/seller",
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_SELLERS: "/admin/sellers",
  ADMIN_PRODUCTS: "/admin/products",
  ADMIN_ORDERS: "/admin/orders",
  ADMIN_CATEGORIES: "/admin/categories",
  AUTH_SIGN_IN: "/auth/sign-in",
  AUTH_SIGN_UP: "/auth/sign-up",
} as const;

export function adminOrderPath(id: string) {
  return `${ROUTES.ADMIN_ORDERS}/${id}`;
}

export function sellerProductEditPath(id: string) {
  return `${ROUTES.SELLER_PRODUCTS}/${id}/edit`;
}

export function sellerPublicPath(idOrSlug: string) {
  return `${ROUTES.SELLER_PUBLIC}/${idOrSlug}`;
}

export function orderPath(id: string) {
  return `${ROUTES.ORDERS}/${id}`;
}

/** Cabinet routes under /seller that require SELLER/ADMIN (not public storefront). */
export const SELLER_CABINET_PREFIXES = [
  "/seller/dashboard",
  "/seller/products",
  "/seller/orders",
  "/seller/analytics",
  "/seller/settings",
] as const;

export function isSellerCabinetPath(pathname: string): boolean {
  if (pathname === "/seller" || pathname === "/seller/") return true;
  return SELLER_CABINET_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

