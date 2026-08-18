export const DESIGN_SYSTEM_VERSION = "1.0.0";

/** Token barrel — safe for theme shim and audits. */
export * from "./tokens/index";

/** Screen-level components (import individually when possible). */
export * from "./components/registry";
export { TextField } from "./components/TextField";
export { IconButton } from "./components/IconButton";
export { AuthErrorCard } from "./components/AuthErrorCard";
export { PrimaryCTA } from "./components/PrimaryCTA";
export { TrustPill } from "./components/TrustPill";
export { CommerceSectionHeader } from "./components/CommerceSectionHeader";
export { BuyerHomeHeader } from "./components/BuyerHomeHeader";
export { CategoryRail, CategoryRailSkeleton } from "./components/CategoryRail";
export { SectionErrorCard } from "./components/SectionErrorCard";
export { CatalogSearchField } from "./components/CatalogSearchField";
export { QuickFilterRail } from "./components/QuickFilterRail";
export { CatalogSortSheet } from "./components/CatalogSortSheet";
export { CatalogProductCard, CatalogGridSkeleton } from "./components/CatalogProductCard";
export { CatalogCategoryRail } from "./components/CatalogCategoryRail";

/**
 * Sub-barrels (prefer direct imports in screens):
 * - design-system/forms
 * - design-system/layout
 * - design-system/primitives
 * - design-system/navigation
 * - design-system/cards
 * - design-system/feedback
 * - design-system/commerce
 */
