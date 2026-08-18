import { spacing } from "./spacing";

export const layout = {
  pagePadding: spacing.lg,
  sectionGap: spacing["2xl"],
  tabBarHeight: 56,
  inputHeight: 44,
  buttonHeight: 44,
  buttonHeightSm: 36,
  buttonHeightLg: 48,
  productCardWidth: "48%" as const,
  maxContentWidth: 480,
} as const;
