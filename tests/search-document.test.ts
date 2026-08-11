import { describe, expect, it } from "vitest";

import { buildSearchDocument } from "@/lib/search/search-document";

describe("ProductSearchDocumentBuilder", () => {
  const doc = buildSearchDocument({
    title: "Тепловая пушка Ballu 5 кВт",
    description: "Электрическая тепловая пушка для гаража и стройплощадки.",
    productTypeName: "Тепловые пушки",
    categoryBreadcrumb: ["Строительство и ремонт", "Климатическая техника", "Тепловые пушки"],
    characteristics: [
      { name: "Мощность", value: "5", unit: "кВт" },
      { name: "Тип нагрева", value: "электрический" },
    ],
    brand: "Ballu",
    aliases: ["тепловая пушка", "теплопушка"],
    storeName: "Инструменты PRO",
    city: "Москва",
  });

  it("aggregates title, type, breadcrumb, characteristics and aliases", () => {
    expect(doc.text).toContain("Тепловая пушка Ballu");
    expect(doc.text).toContain("Тепловые пушки");
    expect(doc.text).toContain("электрический");
    expect(doc.text).toContain("теплопушка");
    expect(doc.text).toContain("Строительство");
  });

  it("weights title and type by repetition", () => {
    const titleCount = doc.text.split("Тепловая пушка Ballu").length - 1;
    expect(titleCount).toBeGreaterThanOrEqual(2);
  });

  it("extracts distinct keywords", () => {
    expect(doc.keywords).toContain("тепловая");
    expect(doc.keywords).toContain("пушка");
    expect(new Set(doc.keywords).size).toBe(doc.keywords.length);
  });

  it("auto-generates SEO metadata (no seller-authored duplicates)", () => {
    expect(doc.metaTitle.length).toBeGreaterThan(0);
    expect(doc.metaTitle.length).toBeLessThanOrEqual(120);
    expect(doc.metaTitle).toContain("LOT");
    expect(doc.metaDescription).toContain("Электрическая тепловая пушка");
    expect(doc.metaDescription.length).toBeLessThanOrEqual(300);
  });

  it("synthesizes a description from specs when none provided", () => {
    const noDesc = buildSearchDocument({
      title: "Ноутбук AeroBook 14",
      productTypeName: "Ноутбуки",
      categoryBreadcrumb: ["Электроника", "Компьютеры", "Ноутбуки"],
      characteristics: [
        { name: "Процессор", value: "Intel i5" },
        { name: "Оперативная память", value: "16", unit: "ГБ" },
      ],
    });
    expect(noDesc.metaDescription).toContain("Характеристики");
    expect(noDesc.metaDescription).toContain("LOT");
  });
});
