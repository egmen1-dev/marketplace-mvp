export const colors = {
  orange: "#FF6B00",
  orangeSoft: "#FFF4EB",
  black: "#111111",
  white: "#FFFFFF",
  gray100: "#F5F5F5",
  gray200: "#EAEAEA",
  gray300: "#D4D4D4",
  gray500: "#737373",
  gray700: "#404040",
  gray900: "#171717",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  success: "#16A34A",
  successSoft: "#F0FDF4",
  warning: "#D97706",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
  h1: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  h2: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  button: { fontSize: 15, fontWeight: "600" as const, lineHeight: 20 },
  buttonSm: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
  /** @deprecated use h1 */
  title: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  /** @deprecated use h2 */
  subtitle: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },
} as const;

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const layout = {
  pagePadding: spacing.lg,
  tabBarHeight: 56,
  inputHeight: 44,
  buttonHeight: 44,
  buttonHeightSm: 36,
  buttonHeightLg: 48,
} as const;
