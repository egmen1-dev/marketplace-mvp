/** Spacing grid — arbitrary margin/padding forbidden (EPIC 84) */

export const spacing = {
  /** 4 */
  xs: 4,
  /** 8 */
  sm: 8,
  /** 12 */
  md: 12,
  /** 16 */
  lg: 16,
  /** 20 */
  xl: 20,
  /** 24 */
  "2xl": 24,
  /** 32 */
  "3xl": 32,
  /** 40 */
  "4xl": 40,
  /** 48 */
  "5xl": 48,
  /** @deprecated use xl (20) — was 24 in legacy tokens */
  xxl: 32,
} as const;

export type SpacingToken = keyof typeof spacing;

export const SPACING_SCALE = [4, 8, 12, 16, 20, 24, 32, 40, 48] as const;

/** Resolve spacing token or raw grid value */
export function space(token: SpacingToken): number {
  return spacing[token];
}
