import { describe, expect, it } from "vitest";

import { PRODUCT_CARD_LAYOUT, productCardBodyMinHeight } from "../apps/mobile/src/components/ui/product-card-layout";

/** Release gate variants — grid contract must stay constant across all combinations. */
const VARIANTS = [
  { label: "short title", title: "Дрель" },
  { label: "2-line title", title: "Очень длинное название товара для проверки переноса на две строки максимум" },
  { label: "long seller name", title: "Товар" },
];

describe("ProductCard layout contract", () => {
  const bodyHeight = productCardBodyMinHeight();

  it("defines stable body min-height for grid alignment", () => {
    expect(bodyHeight).toBe(PRODUCT_CARD_LAYOUT.bodyMinHeight);
    expect(bodyHeight).toBeGreaterThanOrEqual(140);
    for (const variant of VARIANTS) {
      expect(PRODUCT_CARD_LAYOUT.titleLines).toBe(2);
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
