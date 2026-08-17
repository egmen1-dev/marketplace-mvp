/** Product Design Standard v1 — semantic brand palette (EPIC 84 Wave 0) */

export const brand = {
  /** Primary LOT orange — CTA, tab active, price accent */
  primary: "#FF6B00",
  primarySoft: "#FFF4EB",
  primaryMuted: "#FFB380",
  /** Neutral brand anchor */
  ink: "#111111",
  paper: "#FFFFFF",
} as const;

export const accent = {
  /** Secondary commerce highlights */
  highlight: "#FF6B00",
  highlightSoft: "#FFF4EB",
  link: "#2563EB",
  linkSoft: "#EFF6FF",
} as const;

export const semantic = {
  success: "#16A34A",
  successSoft: "#F0FDF4",
  warning: "#D97706",
  warningSoft: "#FFFBEB",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  info: "#2563EB",
  infoSoft: "#EFF6FF",
} as const;

export const surface = {
  background: "#FFFFFF",
  backgroundMuted: "#F5F5F5",
  card: "#FFFFFF",
  cardElevated: "#FFFFFF",
  overlay: "rgba(17, 17, 17, 0.48)",
  inverse: "#111111",
} as const;

export const text = {
  primary: "#111111",
  secondary: "#404040",
  muted: "#737373",
  disabled: "#A3A3A3",
  inverse: "#FFFFFF",
  link: "#2563EB",
  price: "#111111",
  discount: "#737373",
} as const;

export const border = {
  default: "#EAEAEA",
  strong: "#D4D4D4",
  focus: "#FF6B00",
  danger: "#DC2626",
} as const;

/** @deprecated Use semantic tokens — kept for migration from theme/tokens */
export const colors = {
  orange: brand.primary,
  orangeSoft: brand.primarySoft,
  black: brand.ink,
  white: brand.paper,
  gray100: surface.backgroundMuted,
  gray200: border.default,
  gray300: border.strong,
  gray500: text.muted,
  gray700: text.secondary,
  gray900: "#171717",
  danger: semantic.danger,
  dangerSoft: semantic.dangerSoft,
  success: semantic.success,
  successSoft: semantic.successSoft,
  warning: semantic.warning,
} as const;

export type BrandColor = keyof typeof brand;
export type SemanticColor = keyof typeof semantic;
