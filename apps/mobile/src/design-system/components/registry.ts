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
  { name: "CommerceSearchBar", module: "components/ui/CommerceSearchBar", status: "ready" },
  { name: "Search", module: "components/ui/CommerceSearchBar", status: "ready" },
  { name: "Primary CTA (Login)", module: "design-system/components/PrimaryCTA", status: "ready" },
  { name: "Card", module: "components/ui/cards", status: "ready" },
  { name: "ProductCard", module: "components/ui/ProductCard", status: "needs_redesign", notes: "Sprint 2: real badges; full card refresh in Sprint 3" },
  { name: "SellerCard", module: "components/ui/cards", status: "needs_redesign" },
  { name: "MetricCard", module: "components/ui/cards", status: "needs_redesign" },
  { name: "WalletCard", module: "components/ui/cards", status: "needs_redesign" },
  { name: "Price", module: "components/ui/primitives", status: "ready" },
  { name: "Badge", module: "components/ui/primitives", status: "ready" },
  { name: "StatusBadge", module: "components/ui/primitives", status: "ready" },
  { name: "DiscountBadge", module: "components/ui/primitives", status: "missing" },
  { name: "Modal", module: "components/ui/feedback", status: "missing" },
  { name: "BottomSheet", module: "components/ui/feedback", status: "missing" },
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
