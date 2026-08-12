import { describe, expect, it } from "vitest";

import {
  baseProductTypeSlug,
  parseNumberRange,
  productTypeIdentityKey,
  parseFacetQueryParams,
  facetSelectionsToWhere,
} from "@/lib/catalog-taxonomy";

describe("ProductType identity / dedup helpers", () => {
  it("strips -lot- suffix from slug", () => {
    expect(baseProductTypeSlug("drills-lot-drills")).toBe("drills");
    expect(baseProductTypeSlug("drills")).toBe("drills");
  });

  it("builds stable identity key", () => {
    const a = productTypeIdentityKey({
      name: "Дрели",
      slug: "drills",
      categoryPath: "tools/power-tools",
    });
    const b = productTypeIdentityKey({
      name: "  Дрели ",
      slug: "drills-lot-x",
      categoryPath: "tools/power-tools",
    });
    expect(a.split("::")[1]).toBe(b.split("::")[1]);
  });
});

describe("Facet engine", () => {
  it("parses number ranges", () => {
    expect(parseNumberRange("500-1000")).toEqual({ min: 500, max: 1000 });
    expect(parseNumberRange("800")).toEqual({ min: 800, max: 800 });
    expect(parseNumberRange("")).toBeNull();
  });

  it("parses f_ query params", () => {
    const sp = new URLSearchParams("f_power-w=500-1000&f_brand=Makita&q=drill");
    expect(parseFacetQueryParams(sp)).toEqual([
      { slug: "power-w", value: "500-1000" },
      { slug: "brand", value: "Makita" },
    ]);
  });

  it("builds where clauses for selections", () => {
    const defs = [
      {
        id: "1",
        slug: "power-w",
        name: "Мощность",
        type: "NUMBER",
        unit: "Вт",
        options: null,
        productTypeId: "pt",
        productTypeName: "Дрели",
      },
      {
        id: "2",
        slug: "brand",
        name: "Бренд",
        type: "TEXT",
        unit: null,
        options: null,
        productTypeId: "pt",
        productTypeName: "Дрели",
      },
    ];
    const clauses = facetSelectionsToWhere(
      [
        { slug: "power-w", value: "500-1000" },
        { slug: "brand", value: "Makita" },
      ],
      defs,
    );
    expect(clauses).toHaveLength(2);
  });
});
