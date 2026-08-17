/**
 * Seller Design Language — semantic palette (EPIC 86)
 * Distinct from buyer: revenue-first, operational clarity, business trust.
 */

export const sellerBrand = {
  /** Primary seller accent — business actions */
  primary: "#0F766E",
  primarySoft: "#ECFDF5",
  primaryMuted: "#5EEAD4",
  ink: "#0B1220",
  paper: "#FFFFFF",
} as const;

export const sellerRevenue = {
  positive: "#059669",
  positiveSoft: "#ECFDF5",
  negative: "#DC2626",
  negativeSoft: "#FEF2F2",
  neutral: "#64748B",
  pending: "#D97706",
  pendingSoft: "#FFFBEB",
} as const;

export const sellerInsight = {
  ai: "#7C3AED",
  aiSoft: "#F5F3FF",
  promotion: "#EA580C",
  promotionSoft: "#FFF7ED",
  priority: "#DC2626",
  prioritySoft: "#FEF2F2",
} as const;

export const sellerSurface = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  cardElevated: "#FFFFFF",
  section: "#F1F5F9",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
} as const;

export const sellerText = {
  primary: "#0F172A",
  secondary: "#475569",
  muted: "#94A3B8",
  inverse: "#FFFFFF",
  revenue: "#059669",
  metric: "#0F766E",
} as const;
