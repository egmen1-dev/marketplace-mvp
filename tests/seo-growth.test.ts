import { describe, expect, it } from "vitest";

import {
  buildCategorySeo,
  buildProductTypeSeo,
  computeSeoScore,
  isFacetLandingAllowed,
  productSeoSlug,
  renderSeoTemplate,
  shouldIndexPage,
  SEO_INDEX_THRESHOLD,
} from "@/lib/seo";

describe("seo templates", () => {
  it("renders variables", () => {
    expect(
      renderSeoTemplate("{ProductType} купить — {AppName}", {
        ProductType: "Перфораторы",
        AppName: "Лот",
      }),
    ).toBe("Перфораторы купить — Лот");
  });

  it("builds category/type titles", () => {
    expect(buildCategorySeo({ name: "Инструменты", appName: "Лот" }).title).toMatch(
      /Инструменты/,
    );
    expect(
      buildProductTypeSeo({ name: "Перфораторы", appName: "Лот" }).title,
    ).toMatch(/Перфораторы купить/);
  });
});

describe("seo score + indexing", () => {
  it("scores and gates index", () => {
    const low = computeSeoScore({
      hasTitle: true,
      hasDescription: false,
      contentLength: 10,
      productCount: 0,
      internalLinkCount: 0,
      hasUniqueText: false,
      hasFacets: false,
    });
    expect(low).toBeLessThan(SEO_INDEX_THRESHOLD);
    expect(shouldIndexPage(low, 0)).toBe(false);

    const high = computeSeoScore({
      hasTitle: true,
      hasDescription: true,
      contentLength: 120,
      productCount: 12,
      internalLinkCount: 6,
      hasUniqueText: true,
      hasFacets: true,
    });
    expect(high).toBeGreaterThanOrEqual(SEO_INDEX_THRESHOLD);
    expect(shouldIndexPage(high, 12)).toBe(true);
  });
});

describe("facet seo rules", () => {
  it("blocks thin / blocked facets", () => {
    expect(
      isFacetLandingAllowed({
        enabledRule: true,
        minProductCount: 3,
        productCount: 2,
        characteristicSlug: "power-w",
      }),
    ).toBe(false);
    expect(
      isFacetLandingAllowed({
        enabledRule: true,
        minProductCount: 3,
        productCount: 5,
        characteristicSlug: "color",
      }),
    ).toBe(false);
    expect(
      isFacetLandingAllowed({
        enabledRule: true,
        minProductCount: 3,
        productCount: 5,
        characteristicSlug: "power-w",
      }),
    ).toBe(true);
  });
});

describe("product seo slug", () => {
  it("builds pretty slug while id remains canonical", () => {
    const slug = productSeoSlug({
      brand: "Makita",
      model: "HR2470",
      productType: "Перфораторы",
      title: "Перфоратор",
      id: "cuid123",
    });
    expect(slug).toMatch(/makita/i);
    expect(slug.endsWith("cuid123")).toBe(true);
  });
});
