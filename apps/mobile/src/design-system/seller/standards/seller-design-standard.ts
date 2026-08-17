/**
 * Seller Design Standard v1 — EPIC 86 architecture (no implementation)
 */

export const SELLER_DESIGN_STANDARD_VERSION = "1.0.0";

export const SELLER_DESIGN_PRINCIPLES = [
  "Revenue first — every screen answers: what earns money today?",
  "Action over inventory — show tasks, not tables",
  "Trust through clarity — money and order states must be unambiguous",
  "Separate language — seller teal/ink palette, not buyer orange commerce",
  "No CRUD — no admin grids, no create/edit forms in Sprint architecture",
  "Real data only — hide blocks when API returns nothing; no placeholders",
] as const;

export const SELLER_LAYOUT_RULES = {
  pagePadding: 16,
  sectionGap: 24,
  cardRadius: 20,
  metricRadius: 16,
  chipRadius: 999,
  minTouchTarget: 44,
  heroMetricHeight: 120,
} as const;

export const SELLER_MOTION_RULES = {
  pressScale: 0.98,
  cardElevation: "seller.card",
  transitionMs: 220,
  skeleton: "ShimmerBlock",
} as const;
