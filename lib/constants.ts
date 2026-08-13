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
  /** Unified cabinet home */
  ACCOUNT: "/account",
  PROFILE: "/profile",
  /** Preferred cabinet route; `/profile/history` redirects here. */
  HISTORY: "/history",
  /** @deprecated Use HISTORY — kept for revalidatePath / legacy links. */
  PROFILE_HISTORY: "/history",
  /** Buyer favorites (unified cabinet) */
  FAVORITES: "/account/favorites",
  /** Buyer orders (unified cabinet) */
  ORDERS: "/account/orders",
  /** Account settings (unified cabinet) */
  SETTINGS: "/account/settings",
  /** Seller products in unified cabinet */
  ACCOUNT_PRODUCTS: "/account/products",
  ACCOUNT_PRODUCTS_NEW: "/account/products/new",
  /** Seller sales / incoming orders */
  ACCOUNT_SALES: "/account/sales",
  /** Seller wallet — pending / available */
  ACCOUNT_BALANCE: "/account/balance",
  /** Seller pickup warehouse addresses */
  ACCOUNT_PICKUP_POINTS: "/account/pickup-points",
  ACCOUNT_PICKUP_POINTS_NEW: "/account/pickup-points/new",
  /** Buyer + seller reservation lists (same path; UI branches by role) */
  ACCOUNT_RESERVATIONS: "/account/reservations",
  /** Buyer ↔ seller chat */
  ACCOUNT_MESSAGES: "/account/messages",
  ABOUT: "/about",
  SUPPORT: "/support",
  CONTACTS: "/contacts",
  SELL: "/sell",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  /** Public storefront root — append `/${idOrSlug}` */
  SELLER: "/seller",
  SELLER_PUBLIC: "/seller",
  /**
   * Legacy seller cabinet aliases → unified account paths.
   * Kept so existing actions/links keep working.
   */
  SELLER_DASHBOARD: "/account",
  SELLER_PRODUCTS: "/account/products",
  SELLER_NEW_PRODUCT: "/account/products/new",
  SELLER_ORDERS: "/account/sales",
  SELLER_ANALYTICS: "/account",
  SELLER_SETTINGS: "/account/settings",
  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_SELLERS: "/admin/sellers",
  ADMIN_PRODUCTS: "/admin/products",
  ADMIN_ORDERS: "/admin/orders",
  ADMIN_CATEGORIES: "/admin/categories",
  ADMIN_TAXONOMY_IMPORT: "/admin/taxonomy/import",
  ADMIN_SEO: "/admin/seo",
  ADMIN_AI_UNDERSTANDING: "/admin/ai-understanding",
  ADMIN_RESERVATIONS: "/admin/reservations",
  ADMIN_MESSAGES: "/admin/messages",
  ADMIN_ANALYTICS: "/admin/analytics",
  ADMIN_ADS: "/admin/ads",
  ADMIN_CONVERSION: "/admin/conversion",
  ADMIN_FINANCE: "/admin/finance",
  ADMIN_TRUST: "/admin/trust",
  AUTH_SIGN_IN: "/auth/sign-in",
  AUTH_SIGN_UP: "/auth/sign-up",
  BRANDS: "/brands",
} as const;

export function adminOrderPath(id: string) {
  return `${ROUTES.ADMIN_ORDERS}/${id}`;
}

export function sellerProductEditPath(id: string) {
  return `${ROUTES.ACCOUNT_PRODUCTS}/${id}/edit`;
}

export function sellerPublicPath(idOrSlug: string) {
  return `${ROUTES.SELLER_PUBLIC}/${idOrSlug}`;
}

export function orderPath(id: string) {
  return `${ROUTES.ORDERS}/${id}`;
}

export function conversationPath(id: string) {
  return `${ROUTES.ACCOUNT_MESSAGES}/${id}`;
}

export function adminConversationPath(id: string) {
  return `${ROUTES.ADMIN_MESSAGES}/${id}`;
}

/** Legacy /seller/* cabinet prefixes (still matched for redirects + middleware). */
export const SELLER_CABINET_PREFIXES = [
  "/seller/dashboard",
  "/seller/products",
  "/seller/orders",
  "/seller/analytics",
  "/seller/settings",
] as const;

/** Unified-cabinet seller sections that require SellerProfile. */
export const ACCOUNT_SELLER_PREFIXES = [
  "/account/products",
  "/account/sales",
  "/account/pickup-points",
  "/account/balance",
] as const;

export function isSellerCabinetPath(pathname: string): boolean {
  if (pathname === "/seller" || pathname === "/seller/") return true;
  if (
    SELLER_CABINET_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  return ACCOUNT_SELLER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Map legacy `/seller/*` cabinet URLs to unified `/account/*` paths.
 * Used by middleware edge redirects (avoids RSC redirect + React #310).
 */
export function resolveLegacySellerCabinetRedirect(
  pathname: string,
): string | null {
  if (pathname === "/seller" || pathname === "/seller/") {
    return ROUTES.ACCOUNT;
  }
  if (pathname === "/seller/dashboard") {
    return ROUTES.ACCOUNT;
  }
  if (pathname.startsWith("/seller/dashboard/")) {
    return ROUTES.ACCOUNT;
  }
  if (pathname === "/seller/products/new") {
    return ROUTES.ACCOUNT_PRODUCTS_NEW;
  }
  if (pathname.startsWith("/seller/products/")) {
    return `${ROUTES.ACCOUNT_PRODUCTS}${pathname.slice("/seller/products".length)}`;
  }
  if (pathname === "/seller/products") {
    return ROUTES.ACCOUNT_PRODUCTS;
  }
  if (pathname.startsWith("/seller/orders/")) {
    return `${ROUTES.ACCOUNT_SALES}${pathname.slice("/seller/orders".length)}`;
  }
  if (pathname === "/seller/orders") {
    return ROUTES.ACCOUNT_SALES;
  }
  if (pathname === "/seller/analytics") {
    return ROUTES.ACCOUNT;
  }
  if (pathname === "/seller/settings") {
    return ROUTES.SETTINGS;
  }
  return null;
}
