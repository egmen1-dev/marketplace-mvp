import { describe, expect, it } from "vitest";

import {
  pluralizeCategoryCount,
  pluralizeProductCount,
  pluralizeSellerCount,
} from "@/lib/i18n";

describe("pluralizeProductCount", () => {
  it("handles one / few / many", () => {
    expect(pluralizeProductCount(1)).toBe("1 товар");
    expect(pluralizeProductCount(2)).toBe("2 товара");
    expect(pluralizeProductCount(3)).toBe("3 товара");
    expect(pluralizeProductCount(4)).toBe("4 товара");
    expect(pluralizeProductCount(5)).toBe("5 товаров");
    expect(pluralizeProductCount(11)).toBe("11 товаров");
    expect(pluralizeProductCount(21)).toBe("21 товар");
    expect(pluralizeProductCount(22)).toBe("22 товара");
  });
});

describe("pluralizeSellerCount / pluralizeCategoryCount", () => {
  it("declines sellers and categories", () => {
    expect(pluralizeSellerCount(1)).toBe("1 продавец");
    expect(pluralizeSellerCount(3)).toBe("3 продавца");
    expect(pluralizeSellerCount(5)).toBe("5 продавцов");
    expect(pluralizeCategoryCount(1)).toBe("1 категория");
    expect(pluralizeCategoryCount(2)).toBe("2 категории");
    expect(pluralizeCategoryCount(37)).toBe("37 категорий");
  });
});
