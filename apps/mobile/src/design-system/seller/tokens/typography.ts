import { typography as buyerTypography } from "../../tokens/typography";

/** Seller typography extends buyer scale with metric/business variants */
export const sellerTypography = {
  ...buyerTypography,
  metricHero: { fontSize: 32, lineHeight: 38, fontWeight: "800" as const, letterSpacing: -0.5 },
  metricLarge: { fontSize: 24, lineHeight: 30, fontWeight: "800" as const },
  metricLabel: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const, letterSpacing: 0.4, textTransform: "uppercase" as const },
  insightTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" as const },
  sectionKicker: { fontSize: 11, lineHeight: 14, fontWeight: "700" as const, letterSpacing: 0.6, textTransform: "uppercase" as const },
} as const;
