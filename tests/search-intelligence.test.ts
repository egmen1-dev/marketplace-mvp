import { describe, expect, it } from "vitest";

import { buildLotTaxonomy } from "@/lib/catalog-taxonomy";
import {
  normalizeQuery,
  parseSearchQuery,
  levenshtein,
  type SearchLexicon,
} from "@/lib/search-intelligence";

const tax = buildLotTaxonomy();
const lexicon: SearchLexicon = {
  productTypeTerms: [
    ...new Set(
      tax.productTypes.flatMap((pt) => [
        normalizeQuery(pt.name),
        ...(pt.aliases ?? []).map(normalizeQuery),
      ]),
    ),
  ],
  categoryTerms: [...new Set(tax.categories.map((c) => normalizeQuery(c.name)))],
};

const parse = (q: string) => parseSearchQuery(q, { lexicon });

describe("normalization & layout", () => {
  it("normalizes case/spaces/ё/hyphens", () => {
    expect(normalizeQuery("  Тёплая   Пушка ")).toBe("теплая пушка");
  });
  it("fixes wrong keyboard layout", () => {
    // "ушм" typed on latin (ЙЦУКЕН) layout = "eiv"; layout fix → "ушм".
    const p = parse("eiv");
    expect(p.corrections.some((c) => c.to === "ушм")).toBe(true);
  });
});

describe("spell correction (section 5)", () => {
  it("болгарга → болгарка", () => {
    const p = parse("болгарга");
    expect(p.corrections.some((c) => c.to === "болгарка")).toBe(true);
  });
  it("перфораторр → перфоратор", () => {
    const p = parse("перфораторр");
    expect(p.tokens.join(" ")).toContain("перфоратор");
  });
  it("тепловая пушка → synonyms (phrase group)", () => {
    const p = parse("тепловая пушка");
    expect(p.synonyms).toContain("теплопушка");
  });
  it("levenshtein basics", () => {
    expect(levenshtein("болгарга", "болгарка")).toBe(1);
  });
});

describe("synonyms (section 6)", () => {
  it("ушм → болгарка", () => {
    expect(parse("ушм").synonyms).toContain("болгарка");
  });
  it("ноут → ноутбук", () => {
    expect(parse("ноут").synonyms).toContain("ноутбук");
  });
  it("минимойка → мойка высокого давления", () => {
    expect(parse("минимойка").synonyms).toContain("мойка высокого давления");
  });
});

describe("brand / model / attribute understanding (sections 8/9/10)", () => {
  it("detects brand Makita", () => {
    expect(parse("makita").brands).toContain("makita");
  });
  it("detects model HR2470", () => {
    expect(parse("hr2470").models).toContain("HR2470");
  });
  it("detects attributes 2200 Вт / 18 В / 16 литров / 2 кВт", () => {
    expect(parse("2200 вт").attributes[0]).toMatchObject({ value: 2200, unit: "Вт" });
    expect(parse("18 в").attributes[0]).toMatchObject({ value: 18, unit: "В" });
    expect(parse("16 литров").attributes[0]).toMatchObject({ value: 16, unit: "л" });
    expect(parse("2 квт").attributes[0]).toMatchObject({ value: 2, unit: "кВт" });
  });
});

describe("intent detection (section 16)", () => {
  const cases: Array<{ q: string; intent: string }> = [
    { q: "makita", intent: "BRAND" },
    { q: "hr2470", intent: "MODEL" },
    { q: "makita hr2470", intent: "MIXED" },
    { q: "болгарка bosch 125", intent: "MIXED" },
    { q: "2200 вт", intent: "ATTRIBUTE" },
    { q: "болгарка", intent: "PRODUCT_TYPE" },
    { q: "ноутбук", intent: "PRODUCT_TYPE" },
  ];
  for (const c of cases) {
    it(`${c.q} → ${c.intent}`, () => {
      expect(parse(c.q).intent).toBe(c.intent);
    });
  }
});

describe("mixed queries (section 11)", () => {
  it("Makita перфоратор 800Вт → brand+type+attribute", () => {
    const p = parse("Makita перфоратор 800Вт");
    expect(p.brands).toContain("makita");
    expect(p.attributes.some((a) => a.value === 800 && a.unit === "Вт")).toBe(true);
    expect(p.intent).toBe("MIXED");
  });
});

describe("negative terms architecture (section 12)", () => {
  it("captures 'без аккумулятора' as a negative", () => {
    const p = parse("шуруповерт без аккумулятора");
    expect(p.negatives).toContain("аккумулятора");
  });
});

describe("security (section 23)", () => {
  it("caps very long queries", () => {
    const p = parse("a".repeat(5000));
    expect(p.original.length).toBeLessThanOrEqual(200);
  });
  it("does not throw on regex-special input", () => {
    expect(() => parse("(((*+?[болгарка")).not.toThrow();
  });
});

describe("dataset coverage (section 24)", () => {
  const DATASET = [
    "болгарка", "ушм", "makita", "hr2470", "kolner", "тепловая пушка",
    "iphone", "ноутбук", "смартфон", "дрель", "шуруповерт", "мойка",
    "перфоратор makita", "болгарка bosch 125", "телевизор samsung",
    "2200 вт", "18 в", "красный", "тепловая пушка дизельная",
  ];
  it("every query parses with an intent and explainability", () => {
    for (const q of DATASET) {
      const p = parse(q);
      expect(p.intent).toBeTruthy();
      expect(p.explain.length).toBeGreaterThan(0);
      expect(p.expandedTerms.length + p.brands.length + p.models.length + p.attributes.length)
        .toBeGreaterThan(0);
    }
  });
});
