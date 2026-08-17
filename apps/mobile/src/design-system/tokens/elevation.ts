import { brand, surface } from "./colors";

/** Elevation + shadow tokens */
export const elevation = {
  none: 0,
  sm: 1,
  md: 2,
  lg: 4,
  xl: 8,
} as const;

export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  card: {
    shadowColor: brand.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: elevation.md,
  },
  elevated: {
    shadowColor: brand.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: elevation.lg,
  },
  sheet: {
    shadowColor: brand.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: elevation.xl,
  },
} as const;

export const blur = {
  /** RN blur radius guidance — use with expo-blur when needed */
  sm: 8,
  md: 16,
  lg: 24,
  overlay: surface.overlay,
} as const;
