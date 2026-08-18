/** EPIC 84 — screen inventory for Product Design Audit */

export type MarketplaceScreenId =
  | "splash"
  | "login"
  | "registration"
  | "buyer_home"
  | "catalog"
  | "search"
  | "category"
  | "product_card"
  | "product_details"
  | "favorites"
  | "cart"
  | "checkout"
  | "orders"
  | "profile"
  | "seller_home"
  | "seller_products"
  | "seller_product"
  | "wallet"
  | "statistics"
  | "settings"
  | "notifications"
  | "error"
  | "offline"
  | "loading"
  | "empty_state";

export type MarketplaceScreenDefinition = {
  id: MarketplaceScreenId;
  name: string;
  route: string;
  sourceFiles: string[];
  journey: "buyer" | "seller" | "shared" | "system";
};

export const MARKETPLACE_SCREENS: MarketplaceScreenDefinition[] = [
  { id: "splash", name: "Splash", route: "boot", sourceFiles: ["apps/mobile/app/_layout.tsx"], journey: "system" },
  { id: "login", name: "Login", route: "login", sourceFiles: ["apps/mobile/app/login.tsx"], journey: "shared" },
  { id: "registration", name: "Registration", route: "login", sourceFiles: ["apps/mobile/app/login.tsx"], journey: "shared" },
  { id: "buyer_home", name: "Buyer Home", route: "(tabs)/index", sourceFiles: ["apps/mobile/app/(tabs)/index.tsx"], journey: "buyer" },
  { id: "catalog", name: "Catalog", route: "(tabs)/catalog", sourceFiles: ["apps/mobile/app/(tabs)/catalog.tsx", "apps/mobile/src/features/catalog-discovery/CatalogDiscoveryExperience.tsx"], journey: "buyer" },
  { id: "search", name: "Search", route: "catalog", sourceFiles: ["apps/mobile/app/(tabs)/catalog.tsx", "apps/mobile/src/design-system/components/CatalogSearchField.tsx"], journey: "buyer" },
  { id: "category", name: "Category", route: "catalog", sourceFiles: ["apps/mobile/app/(tabs)/catalog.tsx", "apps/mobile/src/design-system/components/CatalogCategoryRail.tsx"], journey: "buyer" },
  { id: "product_card", name: "Product Card", route: "catalog", sourceFiles: ["apps/mobile/src/design-system/components/CatalogProductCard.tsx"], journey: "buyer" },
  { id: "product_details", name: "Product Details", route: "product/[id]", sourceFiles: ["apps/mobile/app/product/[id].tsx", "apps/mobile/src/features/product-detail/ProductDetailExperience.tsx"], journey: "buyer" },
  { id: "favorites", name: "Favorites", route: "(tabs)/favorites", sourceFiles: ["apps/mobile/app/(tabs)/favorites.tsx"], journey: "buyer" },
  { id: "cart", name: "Cart", route: "cart", sourceFiles: ["apps/mobile/app/cart.tsx", "apps/mobile/src/features/cart-checkout/CartExperience.tsx"], journey: "buyer" },
  { id: "checkout", name: "Checkout", route: "checkout", sourceFiles: ["apps/mobile/app/checkout.tsx", "apps/mobile/src/features/cart-checkout/CheckoutExperience.tsx"], journey: "buyer" },
  { id: "orders", name: "Orders", route: "(tabs)/orders", sourceFiles: ["apps/mobile/app/(tabs)/orders.tsx", "apps/mobile/src/features/orders/OrdersExperience.tsx", "apps/mobile/app/order/[id].tsx"], journey: "buyer" },
  { id: "profile", name: "Profile", route: "(tabs)/profile", sourceFiles: ["apps/mobile/app/(tabs)/profile.tsx"], journey: "shared" },
  { id: "seller_home", name: "Seller Home", route: "(tabs)/seller-home", sourceFiles: ["apps/mobile/app/(tabs)/seller-home.tsx"], journey: "seller" },
  { id: "seller_products", name: "Seller Products", route: "(tabs)/seller-products", sourceFiles: ["apps/mobile/app/(tabs)/seller-products.tsx"], journey: "seller" },
  { id: "seller_product", name: "Seller Product", route: "product/[id]", sourceFiles: ["apps/mobile/app/product/[id].tsx", "apps/mobile/src/features/product-detail/ProductDetailExperience.tsx"], journey: "seller" },
  { id: "wallet", name: "Wallet", route: "(tabs)/wallet", sourceFiles: ["apps/mobile/app/(tabs)/wallet.tsx"], journey: "shared" },
  { id: "statistics", name: "Statistics", route: "(tabs)/seller-sales", sourceFiles: ["apps/mobile/app/(tabs)/seller-sales.tsx"], journey: "seller" },
  { id: "settings", name: "Settings", route: "(tabs)/profile", sourceFiles: ["apps/mobile/app/(tabs)/profile.tsx"], journey: "shared" },
  { id: "notifications", name: "Notifications", route: "profile", sourceFiles: ["apps/mobile/app/(tabs)/profile.tsx"], journey: "shared" },
  { id: "error", name: "Error Screens", route: "error", sourceFiles: ["apps/mobile/src/design-system/feedback/States.tsx", "apps/mobile/src/components/ErrorBoundary.tsx"], journey: "system" },
  { id: "offline", name: "Offline Screens", route: "offline", sourceFiles: ["apps/mobile/src/components/NetworkBanner.tsx"], journey: "system" },
  { id: "loading", name: "Loading", route: "loading", sourceFiles: ["apps/mobile/src/design-system/feedback/States.tsx", "apps/mobile/src/design-system/primitives/Shimmer.tsx"], journey: "system" },
  { id: "empty_state", name: "Empty State", route: "empty", sourceFiles: ["apps/mobile/src/design-system/feedback/States.tsx"], journey: "system" },
];

export const MARKETPLACE_BENCHMARKS = [
  "Wildberries",
  "Ozon",
  "Яндекс Маркет",
  "Amazon",
  "Shopify Shop",
  "Airbnb",
  "Apple Store",
] as const;
