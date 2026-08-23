/** ProductCard layout contract — stable slot heights for grid alignment. */
export const PRODUCT_CARD_LAYOUT = {
  priceRowMinHeight: 24,
  titleMinHeight: 36,
  titleLines: 2,
  ratingSlotMinHeight: 18,
  sellerSlotMinHeight: 18,
  locationMinHeight: 18,
  metaRowMinHeight: 18,
  ctaMinHeight: 40,
  imageAspectRatio: 0.92,
} as const;

export function productCardBodyMinHeight(): number {
  const s = PRODUCT_CARD_LAYOUT;
  return (
    s.priceRowMinHeight +
    s.titleMinHeight +
    s.ratingSlotMinHeight +
    s.sellerSlotMinHeight +
    s.locationMinHeight +
    s.metaRowMinHeight +
    s.ctaMinHeight
  );
}
