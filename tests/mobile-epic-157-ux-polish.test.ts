import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PRODUCT_CARD_LAYOUT, productCardBodyMinHeight } from "../apps/mobile/src/components/ui/product-card-layout";

const tabsLayout = readFileSync("apps/mobile/app/(tabs)/_layout.tsx", "utf8");
const homeScreen = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
const catalogScreen = readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8");
const productCard = readFileSync("apps/mobile/src/components/ui/ProductCard.tsx", "utf8");
const productImageFallback = readFileSync("apps/mobile/src/components/ui/ProductImageFallback.tsx", "utf8");
const productCartCta = readFileSync("apps/mobile/src/components/ui/ProductCartCta.tsx", "utf8");
const chip = readFileSync("apps/mobile/src/components/ui/Chip.tsx", "utf8");
const catalogToolbar = readFileSync("apps/mobile/src/components/ui/CatalogToolbar.tsx", "utf8");
const feedback = readFileSync("apps/mobile/src/components/ui/feedback.tsx", "utf8");
const commerceActions = readFileSync("apps/mobile/src/hooks/useCommerceActions.ts", "utf8");

describe("EPIC 157 — no duplicate native header", () => {
  it("hides tab native headers globally and on Home/Catalog", () => {
    expect(tabsLayout).toContain("headerShown: false");
    expect(tabsLayout).toMatch(/name="index"[\s\S]*headerShown: false/);
    expect(tabsLayout).toMatch(/name="catalog"[\s\S]*headerShown: false/);
  });

  it("keeps CommerceHeader as in-screen chrome on Home and Catalog", () => {
    expect(homeScreen).toContain("<CommerceHeader compact />");
    expect(catalogScreen).toContain("<CommerceHeader compact />");
    expect(homeScreen).not.toContain('subtitle="Товары рядом');
  });
});

describe("EPIC 157 — product card polish", () => {
  it("uses branded image fallback instead of gray LOT block", () => {
    expect(productCard).toContain("ProductImageFallback");
    expect(productImageFallback).toContain("Нет фото");
    expect(productImageFallback).toContain("image-outline");
    expect(productCard).not.toContain('imageFallbackText">ЛОТ');
  });

  it("keeps stable body min-height contract", () => {
    expect(productCardBodyMinHeight()).toBe(PRODUCT_CARD_LAYOUT.bodyMinHeight);
    expect(PRODUCT_CARD_LAYOUT.bodyMinHeight).toBeGreaterThanOrEqual(140);
    expect(PRODUCT_CARD_LAYOUT.titleLines).toBe(2);
  });

  it("pins CTA to bottom with ProductCartCta stepper", () => {
    expect(productCard).toContain("ProductCartCta");
    expect(productCartCta).toContain("В корзину");
    expect(productCartCta).toContain("stepper");
    expect(productCard).toContain("justifyContent: \"space-between\"");
  });
});

describe("EPIC 157 — category chips", () => {
  it("uses readable two-line category chip variant in CategoryRail", () => {
    expect(chip).toContain('variant?: "default" | "category"');
    expect(chip).toContain("numberOfLines={isCategory ? 2 : 1}");
    expect(catalogToolbar).toContain('variant="category"');
  });
});

describe("EPIC 157 — catalog empty states", () => {
  it("defines contextual empty presets", () => {
    expect(feedback).toContain("catalogCategory");
    expect(feedback).toContain("catalogSearch");
  });

  it("selects catalog empty preset from filters/search state", () => {
    expect(catalogScreen).toContain("catalogEmptyPreset");
    expect(catalogScreen).toContain('return "catalogSearch"');
    expect(catalogScreen).toContain('return "catalogCategory"');
  });
});

describe("EPIC 157 — inline cart CTA wiring", () => {
  it("exposes increment/decrement cart handlers for product cards", () => {
    expect(commerceActions).toContain("incrementProductCart");
    expect(commerceActions).toContain("decrementProductCart");
    expect(homeScreen).toContain("onIncrementCart");
    expect(catalogScreen).toContain("onDecrementCart");
  });
});
