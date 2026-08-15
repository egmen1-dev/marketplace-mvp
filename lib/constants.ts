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
  /** Seller fulfillment — orders to ship */
  ACCOUNT_ORDERS_SHIP: "/account/orders/ship",
  /** Seller virtual balance (finance foundation) — legacy; redirects to wallet */
  ACCOUNT_BALANCE: "/account/balance",
  /** Seller payout requests — legacy; redirects to wallet withdraw tab */
  ACCOUNT_PAYOUTS: "/account/payouts",
  /** Unified LOT Wallet — buyer + seller money */
  ACCOUNT_WALLET: "/account/wallet",
  /** Legacy alias → promotion center */
  ACCOUNT_PROMOTIONS: "/account/promotions",
  /** Seller AI command center + journey */
  ACCOUNT_COMMAND_CENTER: "/account/command-center",
  /** Unified seller business workspace — «Мой бизнес» */
  ACCOUNT_BUSINESS: "/account/business",
  /** Seller growth hub — unified journey + recommendations */
  ACCOUNT_GROWTH: "/account/growth",
  /** Seller promotion hub (campaigns, visibility) */
  ACCOUNT_PROMOTION_CENTER: "/account/promotion-center",
  /** Seller first experience — «Старт продавца» */
  ACCOUNT_SELLER_START: "/account/seller-start",
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
  ADMIN_FINANCE: "/admin/finance",
  ADMIN_PAYOUTS: "/admin/payouts",
  ADMIN_CONVERSION: "/admin/conversion",
  ADMIN_FOUNDATION: "/admin/foundation",
  ADMIN_OPERATIONS: "/admin/operations",
  ADMIN_TRUST: "/admin/trust",
  /** Trust score analytics for admins */
  ADMIN_TRUST_CENTER: "/admin/trust-center",
  ADMIN_MODERATION: "/admin/moderation",
  ADMIN_DELIVERY: "/admin/delivery",
  ADMIN_DELIVERY_HEALTH: "/admin/delivery/health",
  ADMIN_PAYMENTS: "/admin/payments",
  ADMIN_FINANCIAL_INCIDENTS: "/admin/financial-incidents",
  ADMIN_WALLET: "/admin/wallet",
  ADMIN_HEALTH: "/admin/health",
  ADMIN_UX_HEALTH: "/admin/ux-health",
  ADMIN_LAUNCH: "/admin/launch",
  /** Seller reputation hub */
  ACCOUNT_REPUTATION: "/account/reputation",
  AUTH_SIGN_IN: "/auth/sign-in",
  AUTH_SIGN_UP: "/auth/sign-up",
  /** Unified notifications inbox */
  NOTIFICATIONS: "/notifications",
  BRANDS: "/brands",
  /** Consumer discovery experience */
  DISCOVER: "/discover",
  DISCOVER_COLLECTIONS: "/discover/collections",
  ACCOUNT_DISCOVERY: "/account/discovery",
  /** Seller ranking intelligence dashboard */
  ACCOUNT_RANKING: "/account/ranking",
  ADMIN_DISCOVERY: "/admin/discovery",
  /** Admin ranking intelligence center */
  ADMIN_RANKING: "/admin/ranking",
  /** Social growth / viral commerce */
  SOCIAL: "/social",
  SOCIAL_COLLECTIONS: "/social/c",
  ACCOUNT_FINDS: "/account/finds",
  ACCOUNT_SOCIAL_TOOLS: "/account/social-tools",
  ADMIN_SOCIAL_GROWTH: "/admin/social-growth",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_SYSTEM_FLAGS: "/admin/system-flags",
} as const;

export function discoveryCollectionPath(slug: string) {
  return `${ROUTES.DISCOVER_COLLECTIONS}/${slug}`;
}

export function socialCollectionPath(slug: string) {
  return `${ROUTES.SOCIAL_COLLECTIONS}/${slug}`;
}

export function socialLandingPath(path: string) {
  return `${ROUTES.SOCIAL}/${path}`;
}

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
  "/account/payouts",
  "/account/wallet",
  "/account/business",
  "/account/command-center",
  "/account/growth",
  "/account/promotion-center",
  "/account/discovery",
  "/account/ranking",
  "/account/finds",
  "/account/social-tools",
  "/account/seller-start",
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
  if (process.env.LOT_WALLET_ENABLED !== "false") {
    if (pathname === ROUTES.ACCOUNT_BALANCE) {
      return `${ROUTES.ACCOUNT_WALLET}?tab=overview`;
    }
    if (pathname === ROUTES.ACCOUNT_PAYOUTS) {
      return `${ROUTES.ACCOUNT_WALLET}?tab=withdraw`;
    }
  }
  return null;
}
