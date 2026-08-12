import { describe, expect, it } from "vitest";

import {
  brandModelBoostHint,
  confidenceLevel,
  extractBrand,
  extractModel,
  extractRawAttributes,
  mapAttributesToDefinitions,
  suggestSeo,
  toFieldConfidence,
} from "@/lib/product-understanding";

describe("product understanding — brand / model", () => {
  it("extracts Makita + HR2470", () => {
    const title = "Перфоратор Makita HR2470 780Вт";
    const brand = extractBrand(title);
    expect(brand?.name).toBe("Makita");
    expect(brand?.confidence.level).toBe("high");
    const model = extractModel(title, brand?.name);
    expect(model?.name).toMatch(/HR2470/i);
  });

  it("extracts Bosch GSR120-like SKU", () => {
    const title = "Шуруповёрт Bosch GSR 120";
    expect(extractBrand(title)?.name).toBe("Bosch");
    expect(extractModel(title, "Bosch")?.name).toMatch(/GSR/i);
  });

  it("extracts Apple iPhone model phrase", () => {
    const title = "Apple iPhone 15 Pro 256GB";
    expect(extractBrand(title)?.name).toBe("Apple");
    expect(extractModel(title, "Apple")?.name).toMatch(/iPhone 15 Pro/i);
  });
});

describe("product understanding — attributes", () => {
  it("extracts power and SDS+", () => {
    const raw = extractRawAttributes("Перфоратор Bosch 800Вт SDS+");
    expect(raw.some((a) => a.slugHint === "power" && a.valueNumber === 800)).toBe(
      true,
    );
    expect(raw.some((a) => a.slugHint === "chuck")).toBe(true);
  });

  it("maps onto characteristic definitions without inventing defs", () => {
    const raw = extractRawAttributes("Перфоратор 780Вт");
    const mapped = mapAttributesToDefinitions(raw, [
      {
        id: "def1",
        slug: "power-w",
        name: "Мощность",
        type: "NUMBER",
        unit: "Вт",
      },
    ]);
    expect(mapped[0]?.definitionId).toBe("def1");
    expect(mapped[0]?.valueNumber).toBe(780);
    expect(mapped[0]?.confidence.score).toBeGreaterThanOrEqual(0.75);
  });

  it("keeps unmapped attrs at medium/low confidence", () => {
    const raw = extractRawAttributes("Инструмент 220В");
    const mapped = mapAttributesToDefinitions(raw, []);
    expect(mapped[0]?.definitionId).toBeUndefined();
    expect(mapped[0]?.confidence.level).toBe("low");
  });
});

describe("product understanding — confidence + SEO", () => {
  it("levels thresholds", () => {
    expect(confidenceLevel(0.9)).toBe("high");
    expect(confidenceLevel(0.5)).toBe("medium");
    expect(confidenceLevel(0.2)).toBe("low");
    expect(toFieldConfidence(1.5).score).toBeLessThanOrEqual(0.99);
  });

  it("suggests SEO into existing field shapes", () => {
    const seo = suggestSeo({
      title: "Перфоратор Makita HR2470",
      productTypeName: "Перфораторы",
      brand: "Makita",
      model: "HR2470",
      characteristics: [{ name: "Мощность", valueText: "780 Вт" }],
    });
    expect(seo.title).toMatch(/Makita/i);
    expect(seo.description.length).toBeGreaterThan(20);
    expect(seo.shortDescription).toMatch(/Makita/);
  });
});

describe("product understanding — search boost foundation", () => {
  it("boosts brand and model hits", () => {
    expect(
      brandModelBoostHint({
        queryToken: "makita",
        brandName: "Makita",
        modelName: "HR2470",
      }),
    ).toBeGreaterThan(1);
    expect(
      brandModelBoostHint({
        queryToken: "HR2470",
        brandName: "Makita",
        modelName: "HR2470",
      }),
    ).toBeGreaterThan(1);
  });
});
