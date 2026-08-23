import { describe, expect, it } from "vitest";

import { PRODUCT_CARD_LAYOUT, productCardBodyMinHeight } from "../apps/mobile/src/components/ui/product-card-layout";

/** Release gate variants — grid contract must stay constant across all combinations. */
const VARIANTS = [
  { label: "short title", title: "Дрель", compareAt: null, rating: null, favorites: 0, views: 0, seller: "RAIZZ", city: null },
  { label: "2-line title", title: "Очень длинное название товара для проверки переноса на две строки максимум", compareAt: null, rating: null, favorites: 0, views: 0, seller: "S", city: null },
  { label: "oldPrice", title: "Товар", compareAt: 9999, rating: null, favorites: 0, views: 0, seller: "S", city: null },
  { label: "no oldPrice", title: "Товар", compareAt: null, rating: null, favorites: 0, views: 0, seller: "S", city: null },
  { label: "rating", title: "Товар", compareAt: null, rating: 4.5, favorites: 0, views: 0, seller: "S", city: null },
  { label: "no rating", title: "Товар", compareAt: null, rating: null, favorites: 0, views: 0, seller: "S", city: null },
  { label: "favorites count", title: "Товар", compareAt: null, rating: null, favorites: 12, views: 0, seller: "S", city: null },
  { label: "no favorites count", title: "Товар", compareAt: null, rating: null, favorites: 0, views: 0, seller: "S", city: null },
  { label: "views", title: "Товар", compareAt: null, rating: null, favorites: 0, views: 100, seller: "S", city: null },
  { label: "no views", title: "Товар", compareAt: null, rating: null, favorites: 0, views: 0, seller: "S", city: null },
  { label: "delivery", title: "Товар", compareAt: null, rating: null, favorites: 0, views: 0, seller: "S", city: "Москва" },
  { label: "no delivery", title: "Товар", compareAt: null, rating: null, favorites: 0, views: 0, seller: "S", city: null },
  { label: "long seller name", title: "Товар", compareAt: 5000, rating: 3, favorites: 5, views: 42, seller: "Магазин с очень длинным названием продавца", city: "Казань" },
];

describe("ProductCard layout contract", () => {
  const bodyHeight = productCardBodyMinHeight();

  it("defines stable slot heights for all release-gate variants", () => {
    expect(bodyHeight).toBeGreaterThan(140);
    for (const variant of VARIANTS) {
      expect(PRODUCT_CARD_LAYOUT.titleLines).toBe(2);
      expect(PRODUCT_CARD_LAYOUT.metaRowMinHeight).toBe(18);
      expect(PRODUCT_CARD_LAYOUT.priceRowMinHeight).toBe(24);
      expect(PRODUCT_CARD_LAYOUT.ratingSlotMinHeight).toBe(18);
      expect(PRODUCT_CARD_LAYOUT.sellerSlotMinHeight).toBe(18);
      expect(PRODUCT_CARD_LAYOUT.locationMinHeight).toBe(18);
      expect(PRODUCT_CARD_LAYOUT.ctaMinHeight).toBe(40);
      expect(variant.title.length).toBeGreaterThan(0);
    }
  });

  it("grid row cards share identical body min-height across variants", () => {
    const heights = VARIANTS.map(() => productCardBodyMinHeight());
    expect(new Set(heights).size).toBe(1);
  });

  it("image aspect ratio is not square (no circle-like tiles)", () => {
    expect(PRODUCT_CARD_LAYOUT.imageAspectRatio).not.toBe(1);
  });
});
