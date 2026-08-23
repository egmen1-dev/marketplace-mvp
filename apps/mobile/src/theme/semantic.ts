import { colors, radii, spacing, typography } from "./tokens";

/** Semantic aliases — prefer these in new/refined UI over raw palette tokens. */
export const semantic = {
  background: colors.white,
  surface: colors.white,
  surfaceSecondary: colors.gray100,
  textPrimary: colors.black,
  textSecondary: colors.gray500,
  border: colors.gray200,
  accent: colors.orange,
  accentSoft: colors.orangeSoft,
  accentPressed: "#E55F00",
  success: colors.success,
  warning: colors.warning,
  error: colors.danger,
  disabled: colors.gray300,
} as const;

export const componentRadii = {
  chip: radii.pill,
  input: radii.md,
  card: radii.lg,
  modal: radii.xl,
  button: radii.md,
} as const;

export const textStyles = {
  price: { fontSize: 18, fontWeight: "700" as const, lineHeight: 24, color: colors.black },
  priceCompare: { ...typography.caption, color: colors.gray500, textDecorationLine: "line-through" as const },
  h3: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22, color: colors.black },
  bodySecondary: { ...typography.body, color: colors.gray500 },
} as const;

export { colors, radii, spacing, typography };
