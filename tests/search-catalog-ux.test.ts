import { describe, expect, it } from "vitest";

import {
  searchTokenVariants,
  tokenizeSearchQuery,
} from "@/features/products/search-query";
import { buildListingHref, parseCatalogParams } from "@/features/catalog/url";

describe("search tokenization", () => {
  it("splits multi-word queries", () => {
    expect(tokenizeSearchQuery("тепловая пушка")).toEqual([
      "тепловая",
      "пушка",
    ]);
  });

  it("stems дрель toward дрел for category Дрели", () => {
    const variants = searchTokenVariants("дрель");
    expect(variants.some((v) => "дрели".includes(v) || v === "дрел")).toBe(
      true,
    );
  });

  it("stems тепловая toward теплов for Тепловые пушки", () => {
    const variants = searchTokenVariants("тепловая");
    expect(variants.some((v) => v.startsWith("теплов"))).toBe(true);
  });
});

describe("catalog listing href", () => {
  it("keeps SEO category path when applying filters", () => {
    const href = buildListingHref("/category/tools", {
      priceMin: 1000,
      priceMax: 5000,
      sort: "price_asc",
    });
    expect(href).toContain("/category/tools?");
    expect(href).toContain("priceMin=1000");
    expect(href).toContain("priceMax=5000");
    expect(href).toContain("sort=price_asc");
    expect(href).not.toContain("category=");
  });

  it("builds catalog URL with filters", () => {
    const href = buildListingHref("/catalog", {
      q: "дрель",
      priceMin: 100,
      inStock: true,
    });
    expect(href.startsWith("/catalog?")).toBe(true);
    expect(href).toContain("q=");
    expect(href).toContain("priceMin=100");
    expect(href).toContain("inStock=1");
  });

  it("parses filter params from URL", () => {
    const parsed = parseCatalogParams({
      priceMin: "1000",
      priceMax: "9000",
      seller: "raizz",
      inStock: "1",
      sort: "price_asc",
    });
    expect(parsed.priceMin).toBe(1000);
    expect(parsed.priceMax).toBe(9000);
    expect(parsed.seller).toBe("raizz");
    expect(parsed.inStock).toBe(true);
    expect(parsed.sort).toBe("price_asc");
  });
});
