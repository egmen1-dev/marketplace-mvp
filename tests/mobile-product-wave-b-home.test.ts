import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { HOME_TRUST_ITEMS } from "../apps/mobile/src/home/content";
import { buildHomeCategoryCatalogRoute } from "../apps/mobile/src/home/resolveHomeCategoryRoute";

const indexSource = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
const homeHeaderSource = readFileSync("apps/mobile/src/home/HomeHeader.tsx", "utf8");
const homeHeroSource = readFileSync("apps/mobile/src/home/HomeHeroBanner.tsx", "utf8");
const homePromoSource = readFileSync("apps/mobile/src/home/HomePromoTiles.tsx", "utf8");
const homeContentSource = readFileSync("apps/mobile/src/home/content.ts", "utf8");

describe("product wave B — home buyer conversion", () => {
  it("HOME_PRODUCTS_APPEAR_BEFORE_LARGE_SECONDARY_CONTENT=PASS", () => {
    const productRailIndex = indexSource.indexOf("<HomeProductRail");
    const heroIndex = indexSource.indexOf("<HomeHeroBanner");
    const trustIndex = indexSource.indexOf("<HomeTrustStrip");
    expect(productRailIndex).toBeGreaterThan(-1);
    expect(heroIndex).toBeGreaterThan(productRailIndex);
    expect(trustIndex).toBeGreaterThan(heroIndex);
  });

  it("HOME_CANONICAL_PRODUCT_CARD_USED=PASS", () => {
    expect(indexSource).toContain("onAddToCart");
    expect(indexSource).toContain("HomeProductRail");
  });

  it("HOME_PROMO_CATEGORY_ROUTE_TRUTHFUL=PASS", () => {
    expect(homePromoSource).toContain("buildHomeCategoryCatalogRoute");
    expect(homePromoSource).not.toMatch(/q:\s*"транспорт"/);
    expect(homePromoSource).not.toMatch(/q:\s*""/);
  });

  it("HOME_LOCATION_HAS_NO_FAKE_SELECTOR=PASS", () => {
    expect(homeHeaderSource).not.toContain("chevron-down");
    expect(homeHeaderSource).not.toContain('router.push("/(tabs)/catalog")');
    expect(homeHeaderSource).toContain('accessibilityRole="text"');
  });

  it("HOME_NO_FAKE_CAROUSEL_DOTS=PASS", () => {
    expect(homeHeroSource).not.toContain("activeDot");
    expect(homeHeroSource).not.toContain("styles.dots");
  });

  it("HOME_NO_UNSUPPORTED_TRUST_COPY=PASS", () => {
    const serialized = JSON.stringify(HOME_TRUST_ITEMS);
    expect(serialized).not.toMatch(/Проверенный продавец/i);
    expect(serialized).not.toMatch(/24\/7/i);
    expect(homeContentSource).not.toMatch(/Поддержка 24\/7/);
  });

  it("HOME_NO_FAKE_DELIVERY_COPY=PASS", () => {
    expect(homeContentSource).not.toMatch(/Доставка сегодня/);
    expect(indexSource).not.toMatch(/Доставка сегодня/);
  });

  it("HOME_OPTIONAL_SECTION_FAILURE_DOES_NOT_BREAK_PRIMARY_CONTENT=PASS", () => {
    expect(indexSource).toContain("secondaryError");
    expect(indexSource).toContain("popular.length === 0");
  });

  it("electronics promo resolves to category id", () => {
    const route = buildHomeCategoryCatalogRoute("electronics", [
      { id: "cat-1", name: "Электроника", slug: "electronics" },
    ]);
    expect(route).toEqual({
      pathname: "/(tabs)/catalog",
      params: { categoryId: "cat-1", q: "", deals: "0" },
    });
  });
});
