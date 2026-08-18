/**
 * Design System component registry — Sprint 90 unified paths.
 */

export type ComponentStatus = "ready" | "needs_redesign" | "missing";

export type DesignSystemComponent = {
  name: string;
  module: string;
  status: ComponentStatus;
  notes?: string;
};

export const DESIGN_SYSTEM_COMPONENTS: DesignSystemComponent[] = [
  { name: "PrimaryButton", module: "design-system/forms/buttons", status: "ready" },
  { name: "SecondaryButton", module: "design-system/forms/buttons", status: "ready" },
  { name: "GhostButton", module: "design-system/forms/buttons", status: "ready" },
  { name: "Input", module: "design-system/components/TextField", status: "ready" },
  { name: "CommerceSearchBar", module: "design-system/commerce/CommerceSearchBar", status: "ready", notes: "Home search; catalog uses CatalogSearchField" },
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
  { name: "Primary CTA (Login)", module: "design-system/components/PrimaryCTA", status: "ready" },
  { name: "ProductCard", module: "design-system/commerce/ProductCard", status: "ready", notes: "Home rails; catalog grid uses CatalogProductCard" },
  { name: "MetricCard", module: "design-system/cards/CommerceCards", status: "ready" },
  { name: "WalletCard", module: "design-system/cards/CommerceCards", status: "ready" },
  { name: "Badge", module: "design-system/primitives/Badge", status: "ready" },
  { name: "Avatar", module: "design-system/primitives/Badge", status: "ready" },
  { name: "TabBarIcon", module: "design-system/navigation/TabBarIcon", status: "ready" },
  { name: "TabBarBadge", module: "design-system/navigation/TabBarBadge", status: "ready" },
  { name: "EmptyState", module: "design-system/feedback/States", status: "ready" },
  { name: "ErrorState", module: "design-system/feedback/States", status: "ready" },
  { name: "Skeleton", module: "design-system/primitives/Shimmer", status: "ready" },
  { name: "ShimmerBlock", module: "design-system/primitives/Shimmer", status: "ready" },
  { name: "PageContainer", module: "design-system/layout/ScreenLayout", status: "ready" },
  { name: "PageScroll", module: "design-system/layout/ScreenLayout", status: "ready" },
  { name: "SellerProductCard", module: "design-system/cards/SellerProductCard", status: "ready" },
  { name: "IconButton", module: "design-system/components/IconButton", status: "ready" },
  { name: "BottomSheet", module: "design-system/components/CatalogSortSheet", status: "ready", notes: "Catalog sort sheet" },
  { name: "Tab", module: "expo-router Tabs", status: "ready" },
  { name: "Navigation", module: "app/(tabs)/_layout", status: "ready" },
  { name: "Modal", module: "design-system/components/CatalogSortSheet", status: "missing" },
  { name: "Toast", module: "design-system/feedback/States", status: "missing" },
  { name: "Snackbar", module: "design-system/feedback/States", status: "missing" },
  { name: "Dialog", module: "design-system/feedback/States", status: "missing" },
  { name: "Chip", module: "design-system/primitives/Badge", status: "missing" },
  { name: "FAB", module: "design-system/forms/buttons", status: "missing" },
  { name: "DiscountBadge", module: "design-system/primitives/Badge", status: "missing" },
];

export function getComponentCoverage() {
  const total = DESIGN_SYSTEM_COMPONENTS.length;
  const ready = DESIGN_SYSTEM_COMPONENTS.filter((c) => c.status === "ready").length;
  const needsRedesign = DESIGN_SYSTEM_COMPONENTS.filter((c) => c.status === "needs_redesign").length;
  const missing = DESIGN_SYSTEM_COMPONENTS.filter((c) => c.status === "missing").length;
  return { total, ready, needsRedesign, missing, coveragePercent: Math.round((ready / total) * 1000) / 10 };
}
