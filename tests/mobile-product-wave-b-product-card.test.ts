import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const catalogSource = readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8");
const homeRailSource = readFileSync("apps/mobile/src/home/HomeProductRail.tsx", "utf8");
const relatedRailSource = readFileSync("apps/mobile/src/product/ui/ProductRelatedRail.tsx", "utf8");
const productCardSource = readFileSync("apps/mobile/src/commerce/product-card/ProductCard.tsx", "utf8");
const productCardTypesSource = readFileSync("apps/mobile/src/commerce/product-card/types.ts", "utf8");
const productCardImageSource = readFileSync("apps/mobile/src/commerce/product-card/ProductCardImage.tsx", "utf8");
const commerceActionsSource = readFileSync("apps/mobile/src/hooks/useCommerceActions.ts", "utf8");
const legacyProductCardSource = readFileSync("apps/mobile/src/components/ui/ProductCard.tsx", "utf8");

describe("product wave B — canonical product card", () => {
  it("PRODUCT_CARD_GRID_STABLE=PASS", () => {
    expect(productCardTypesSource).toContain("cardHeight: 318");
    expect(productCardTypesSource).toContain("titleLines: 2");
    expect(productCardSource).toContain('variant === "grid"');
  });

  it("PRODUCT_CARD_RAIL_STABLE=PASS", () => {
    expect(productCardTypesSource).toContain("cardHeight: 286");
    expect(productCardSource).toContain('variant === "rail"');
  });

  it("PRODUCT_CARD_DISCOUNT_VALID_ONLY=PASS", () => {
    expect(productCardImageSource).toContain("discountPercent");
    expect(productCardSource).not.toMatch(/compareAt\s*&&\s*compareAt\s*>=\s*price/);
  });

  it("PRODUCT_CARD_UNSUPPORTED_DELIVERY_CLAIM_ABSENT=PASS", () => {
    expect(productCardSource).not.toContain("Доставка");
    expect(productCardImageSource).not.toContain("Доставка");
  });

  it("PRODUCT_CARD_UNSUPPORTED_RESPONSE_SPEED_ABSENT=PASS", () => {
    expect(productCardSource).not.toContain("Быстро отвечает");
  });

  it("HOME_USES_CANONICAL_PRODUCT_CARD=PASS", () => {
    expect(homeRailSource).toContain('from "../commerce/product-card"');
    expect(homeRailSource).toContain('variant="rail"');
  });

  it("CATALOG_USES_CANONICAL_PRODUCT_CARD=PASS", () => {
    expect(catalogSource).toContain('from "../../src/commerce/product-card"');
    expect(catalogSource).toContain('variant="grid"');
    expect(catalogSource).not.toContain("CatalogProductCard");
  });

  it("RELATED_USES_CANONICAL_PRODUCT_CARD=PASS", () => {
    expect(relatedRailSource).toContain('from "../../commerce/product-card"');
    expect(relatedRailSource).toContain('variant="rail"');
  });

  it("PRODUCT_CARD_CART_STATE_CONSISTENT=PASS", () => {
    expect(productCardSource).toContain("CommerceCartCta");
    expect(homeRailSource).toContain("onAddToCart");
    expect(catalogSource).toContain("onAddToCart");
    expect(relatedRailSource).toContain("onAddToCart");
  });

  it("PRODUCT_CARD_FAVORITE_STATE_CONSISTENT=PASS", () => {
    expect(productCardSource).toContain("isFavoriteBusy");
    expect(homeRailSource).toContain("isFavoriteBusy");
    expect(catalogSource).toContain("isFavoriteBusy");
  });

  it("CART_BUSY_IS_PER_PRODUCT=PASS", () => {
    expect(commerceActionsSource).toContain("cartBusyProductIds");
    expect(commerceActionsSource).toContain("isCartBusy");
    expect(catalogSource).toContain("isCartBusy(item.id)");
  });

  it("FAVORITE_BUSY_IS_PER_PRODUCT=PASS", () => {
    expect(commerceActionsSource).toContain("favoriteBusyProductIds");
    expect(commerceActionsSource).toContain("isFavoriteBusy");
  });

  it("legacy favorites ProductCard remains outside buyer rails only", () => {
    expect(legacyProductCardSource).toContain("ProductCard");
  });
});
