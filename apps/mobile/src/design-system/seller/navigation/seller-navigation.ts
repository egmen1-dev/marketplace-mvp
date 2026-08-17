import type { SellerScreenId } from "../blueprints/types";

export type SellerTabDefinition = {
  id: string;
  label: string;
  route: string;
  icon: string;
  screenId: SellerScreenId;
  badgeSource?: string;
};

export type SellerDeepLink = {
  path: string;
  screenId: SellerScreenId;
  params?: string;
};

export type SellerPushDestination = {
  event: string;
  route: string;
  screenId: SellerScreenId;
};

/** Seller navigation architecture — EPIC 86 (blueprint only) */
export const SELLER_BOTTOM_TABS: SellerTabDefinition[] = [
  { id: "home", label: "Главная", route: "(tabs)/seller-home", icon: "storefront-outline", screenId: "seller_home", badgeSource: "orders.needAction" },
  { id: "products", label: "Товары", route: "(tabs)/seller-products", icon: "package-variant-closed", screenId: "seller_products", badgeSource: "products.needAttention" },
  { id: "orders", label: "Заказы", route: "(tabs)/seller-sales", icon: "clipboard-list-outline", screenId: "seller_orders", badgeSource: "orders.needAction" },
  { id: "finance", label: "Деньги", route: "(tabs)/wallet", icon: "wallet-outline", screenId: "seller_finance" },
  { id: "profile", label: "Профиль", route: "(tabs)/profile", icon: "account-circle-outline", screenId: "profile" },
];

export const SELLER_STACK_ROUTES: SellerDeepLink[] = [
  { path: "seller/analytics", screenId: "seller_analytics" },
  { path: "seller/promotion", screenId: "seller_promotion" },
  { path: "seller/ai", screenId: "seller_ai_assistant" },
  { path: "product/[id]", screenId: "seller_product_detail", params: "mode=seller" },
  { path: "order/[id]", screenId: "seller_orders" },
  { path: "startup-diagnostics", screenId: "profile" },
  { path: "build-info", screenId: "profile" },
];

export const SELLER_DEEP_LINKS: SellerDeepLink[] = [
  { path: "lot://seller/home", screenId: "seller_home" },
  { path: "lot://seller/products", screenId: "seller_products" },
  { path: "lot://seller/orders", screenId: "seller_orders" },
  { path: "lot://seller/wallet", screenId: "seller_finance" },
  { path: "lot://seller/product/:id", screenId: "seller_product_detail" },
  { path: "lot://seller/analytics", screenId: "seller_analytics" },
  { path: "lot://seller/promotion", screenId: "seller_promotion" },
  { path: "lot://seller/ai", screenId: "seller_ai_assistant" },
];

export const SELLER_PUSH_DESTINATIONS: SellerPushDestination[] = [
  { event: "order.new", route: "/(tabs)/seller-sales", screenId: "seller_orders" },
  { event: "order.need_action", route: "/(tabs)/seller-sales", screenId: "seller_orders" },
  { event: "payout.completed", route: "/(tabs)/wallet", screenId: "seller_finance" },
  { event: "product.low_stock", route: "/(tabs)/seller-products", screenId: "seller_products" },
  { event: "ai.recommendation", route: "/seller/ai", screenId: "seller_ai_assistant" },
  { event: "promotion.expiring", route: "/seller/promotion", screenId: "seller_promotion" },
];

export const SELLER_NAVIGATION_RULES = [
  "Seller mode hides buyer tabs (index, catalog, favorites, buyer orders)",
  "Back stack: stack routes pop to seller-home tab root",
  "Cold start deep link → boot → login if needed → target screen",
  "Warm start restores last seller tab via Expo Router state",
  "Analytics / Promotion / AI — stack modals from home, not tabs (Sprint 6–8)",
] as const;
