/**
 * Component library registry — every base component must use Design System tokens.
 * EPIC 84 Wave 0 Deliverable 4.
 */

export type ComponentStatus = "ready" | "needs_redesign" | "missing";

export type DesignSystemComponent = {
  name: string;
  module: string;
  status: ComponentStatus;
  notes?: string;
};

export const DESIGN_SYSTEM_COMPONENTS: DesignSystemComponent[] = [
  { name: "PrimaryButton", module: "components/ui/buttons", status: "ready" },
  { name: "SecondaryButton", module: "components/ui/buttons", status: "ready" },
  { name: "GhostButton", module: "components/ui/buttons", status: "ready" },
  { name: "DangerButton", module: "components/ui/buttons", status: "ready" },
  { name: "Input", module: "design-system/components/TextField", status: "ready" },
  { name: "SearchBar", module: "components/ui/primitives", status: "needs_redesign", notes: "Upgrade to CommerceSearchBar everywhere" },
  { name: "CommerceSearchBar", module: "components/ui/CommerceSearchBar", status: "ready", notes: "Home search; catalog uses CatalogSearchField" },
  { name: "CatalogSearchField", module: "design-system/components/CatalogSearchField", status: "ready" },
  { name: "QuickFilterRail", module: "design-system/components/QuickFilterRail", status: "ready" },
  { name: "CatalogSortSheet", module: "design-system/components/CatalogSortSheet", status: "ready" },
  { name: "CatalogProductCard", module: "design-system/components/CatalogProductCard", status: "ready" },
  { name: "CatalogCategoryRail", module: "design-system/components/CatalogCategoryRail", status: "ready" },
  { name: "PdpGallery", module: "design-system/components/PdpGallery", status: "ready" },
  { name: "PdpHeroPrice", module: "design-system/components/PdpHeroPrice", status: "ready" },
  { name: "PdpTrustBlock", module: "design-system/components/PdpTrustBlock", status: "ready" },
  { name: "PdpStickyCta", module: "design-system/components/PdpStickyCta", status: "ready" },
  { name: "PdpDescription", module: "design-system/components/PdpDescription", status: "ready" },
  { name: "PdpSpecsTable", module: "design-system/components/PdpSpecsTable", status: "ready" },
  { name: "PdpSellerCard", module: "design-system/components/PdpSellerCard", status: "ready" },
  { name: "PdpHighlights", module: "design-system/components/PdpHighlights", status: "ready" },
  { name: "PdpDeliveryBlock", module: "design-system/components/PdpDeliveryBlock", status: "ready" },
  { name: "PdpRelatedRail", module: "design-system/components/PdpRelatedRail", status: "ready" },
  { name: "PdpSkeleton", module: "design-system/components/PdpSkeleton", status: "ready" },
  { name: "CartHeader", module: "design-system/components/CartHeader", status: "ready" },
  { name: "CartLineCard", module: "design-system/components/CartLineCard", status: "ready" },
  { name: "CartSummaryBar", module: "design-system/components/CartSummaryBar", status: "ready" },
  { name: "CartEmptyState", module: "design-system/components/CartEmptyState", status: "ready" },
  { name: "CartRecommendationsRail", module: "design-system/components/CartRecommendationsRail", status: "ready" },
  { name: "CartStickyCheckoutCta", module: "design-system/components/CartStickyCheckoutCta", status: "ready" },
  { name: "CartPriceSummary", module: "design-system/components/CartPriceSummary", status: "ready" },
  { name: "CartSkeleton", module: "design-system/components/CartSkeleton", status: "ready" },
  { name: "QuantityStepper", module: "design-system/components/QuantityStepper", status: "ready" },
  { name: "CheckoutContactSection", module: "design-system/components/CheckoutContactSection", status: "ready" },
  { name: "CheckoutDeliverySection", module: "design-system/components/CheckoutDeliverySection", status: "ready" },
  { name: "CheckoutOrderSummary", module: "design-system/components/CheckoutOrderSummary", status: "ready" },
  { name: "CheckoutSkeleton", module: "design-system/components/CheckoutSkeleton", status: "ready" },
  { name: "OrdersHeader", module: "design-system/components/OrdersHeader", status: "ready" },
  { name: "OrderCard", module: "design-system/components/OrderCard", status: "ready" },
  { name: "OrdersEmptyState", module: "design-system/components/OrdersEmptyState", status: "ready" },
  { name: "OrdersSkeleton", module: "design-system/components/OrdersSkeleton", status: "ready" },
  { name: "OrderTimeline", module: "design-system/components/OrderTimeline", status: "ready" },
  { name: "OrderDetailSections", module: "design-system/components/OrderDetailSections", status: "ready" },
  { name: "OrdersRecommendationsRail", module: "design-system/components/OrdersRecommendationsRail", status: "ready" },
  { name: "FavoritesHeader", module: "design-system/components/FavoritesHeader", status: "ready" },
  { name: "FavoritesSearchField", module: "design-system/components/FavoritesSearchField", status: "ready" },
  { name: "FavoritesCollectionsRail", module: "design-system/components/FavoritesCollectionsRail", status: "ready" },
  { name: "FavoriteWishlistCard", module: "design-system/components/FavoriteWishlistCard", status: "ready" },
  { name: "FavoritesEmptyState", module: "design-system/components/FavoritesEmptyState", status: "ready" },
  { name: "FavoritesSkeleton", module: "design-system/components/FavoritesSkeleton", status: "ready" },
  { name: "FavoritesContinueRail", module: "design-system/components/FavoritesContinueRail", status: "ready" },
  { name: "FavoritesRecommendationsRail", module: "design-system/components/FavoritesRecommendationsRail", status: "ready" },
  { name: "Search", module: "design-system/components/CatalogSearchField", status: "ready" },
  { name: "Primary CTA (Login)", module: "design-system/components/PrimaryCTA", status: "ready" },
  { name: "Card", module: "components/ui/cards", status: "ready" },
  { name: "ProductCard", module: "components/ui/ProductCard", status: "ready", notes: "Home rails; catalog grid uses CatalogProductCard" },
  { name: "SellerCard", module: "components/ui/cards", status: "needs_redesign" },
  { name: "MetricCard", module: "components/ui/cards", status: "needs_redesign" },
  { name: "WalletCard", module: "components/ui/cards", status: "needs_redesign" },
  { name: "Price", module: "components/ui/primitives", status: "ready" },
  { name: "Badge", module: "components/ui/primitives", status: "ready" },
  { name: "StatusBadge", module: "components/ui/primitives", status: "ready" },
  { name: "DiscountBadge", module: "components/ui/primitives", status: "missing" },
  { name: "Modal", module: "components/ui/feedback", status: "missing" },
  { name: "BottomSheet", module: "design-system/components/CatalogSortSheet", status: "ready", notes: "Catalog sort sheet" },
  { name: "Toast", module: "components/ui/feedback", status: "missing" },
  { name: "Snackbar", module: "components/ui/feedback", status: "missing" },
  { name: "Dialog", module: "components/ui/feedback", status: "missing" },
  { name: "Chip", module: "components/ui/primitives", status: "missing" },
  { name: "Tab", module: "expo-router Tabs", status: "ready" },
  { name: "Navigation", module: "app/(tabs)/_layout", status: "needs_redesign" },
  { name: "Avatar", module: "components/ui/primitives", status: "ready" },
  { name: "IconButton", module: "design-system/components/IconButton", status: "ready" },
  { name: "FAB", module: "components/ui/primitives", status: "missing" },
  { name: "EmptyState", module: "components/ui/feedback", status: "needs_redesign" },
  { name: "ErrorState", module: "components/ui/feedback", status: "ready" },
  { name: "LoadingState", module: "components/ui/feedback", status: "needs_redesign" },
  { name: "Skeleton", module: "components/ui/Shimmer", status: "ready" },
];

export function getComponentCoverage() {
  const total = DESIGN_SYSTEM_COMPONENTS.length;
  const ready = DESIGN_SYSTEM_COMPONENTS.filter((c) => c.status === "ready").length;
  const needsRedesign = DESIGN_SYSTEM_COMPONENTS.filter((c) => c.status === "needs_redesign").length;
  const missing = DESIGN_SYSTEM_COMPONENTS.filter((c) => c.status === "missing").length;
  return { total, ready, needsRedesign, missing, coveragePercent: Math.round((ready / total) * 1000) / 10 };
}
