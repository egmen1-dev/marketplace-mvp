import { brand, semantic } from "./colors";

/** Gradient stops for hero cards, wallet, promos */
export const gradients = {
  brandWarm: [brand.primary, "#FF9240"] as const,
  brandDark: ["#111111", "#2A2A2A"] as const,
  success: [semantic.success, "#22C55E"] as const,
  wallet: ["#111111", "#2D2D2D"] as const,
} as const;

export type GradientToken = keyof typeof gradients;
