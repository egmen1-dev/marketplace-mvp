/** ProductCard layout contract — stable slot heights for grid alignment. */
export const PRODUCT_CARD_LAYOUT = {
  titleMinHeight: 36,
  titleLines: 2,
  ctaMinHeight: 40,
  bodyMinHeight: 148,
  imageAspectRatio: 0.92,
} as const;

export function productCardBodyMinHeight(): number {
  return PRODUCT_CARD_LAYOUT.bodyMinHeight;
}
