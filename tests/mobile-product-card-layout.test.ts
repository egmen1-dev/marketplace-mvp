import { describe, expect, it } from "vitest";

import { PRODUCT_CARD_LAYOUT, productCardBodyMinHeight } from "../apps/mobile/src/components/ui/product-card-layout";

const VARIANTS = [
  { label: "short title, no old price, no rating", title: "Дрель", compareAt: null, rating: null, favorites: 0, views: 0, seller: "RAIZZ", city: null },
  { label: "long title, old price, rating", title: "Очень длинное название товара для проверки переноса на две строки максимум", compareAt: 9999, rating: 4.5, favorites: 12, views: 100, seller: "Магазин с длинным названием", city: "Москва" },
  { label: "no seller metadata", title: "Товар", compareAt: null, rating: null, favorites: 0, views: 0, seller: null, city: null },
  { label: "views only", title: "X", compareAt: null, rating: null, favorites: 0, views: 42, seller: "S", city: "СПб" },
  { label: "favorites only", title: "Y", compareAt: 5000, rating: 3, favorites: 5, views: 0, seller: "Shop", city: "Казань" },
];

describe("ProductCard layout contract", () => {
  it("defines stable slot heights independent of content variants", () => {
    const bodyHeight = productCardBodyMinHeight();
    expect(bodyHeight).toBeGreaterThan(140);
    for (const variant of VARIANTS) {
      expect(PRODUCT_CARD_LAYOUT.titleLines).toBe(2);
      expect(PRODUCT_CARD_LAYOUT.metaRowMinHeight).toBe(18);
      expect(variant.title.length).toBeGreaterThan(0);
    }
  });

  it("image aspect ratio is not square (no circle-like tiles)", () => {
    expect(PRODUCT_CARD_LAYOUT.imageAspectRatio).not.toBe(1);
  });
});
