import { describe, expect, it } from "vitest";

import {
  canPublishActive,
  matchProductTypes,
  normalizeAlias,
  stemToken,
  validateCharacteristicValues,
  type MatchCandidate,
} from "@/lib/catalog-taxonomy";

const candidates: MatchCandidate[] = [
  {
    productTypeId: "pt-heat",
    name: "Тепловые пушки",
    slug: "heat-guns",
    categoryId: "c1",
    breadcrumb: [
      "Строительство и ремонт",
      "Климатическая техника",
      "Обогреватели",
      "Тепловые пушки",
    ],
    aliases: ["тепловая пушка", "пушка", "теплопушка"],
  },
  {
    productTypeId: "pt-gas",
    name: "Газовые тепловые пушки",
    slug: "gas-heat-guns",
    categoryId: "c1",
    breadcrumb: ["Строительство и ремонт", "Газовые тепловые пушки"],
    aliases: ["газовая пушка"],
  },
  {
    productTypeId: "pt-ag",
    name: "Угловые шлифовальные машины",
    slug: "angle-grinders",
    categoryId: "c2",
    breadcrumb: ["Инструменты", "Электроинструмент", "УШМ"],
    aliases: ["болгарка", "ушм"],
  },
  {
    productTypeId: "pt-heater",
    name: "Обогреватели",
    slug: "heaters-generic",
    categoryId: "c1",
    breadcrumb: ["Климатическая техника", "Обогреватели"],
    aliases: [],
  },
];

describe("normalize / stem", () => {
  it("normalizes aliases", () => {
    expect(normalizeAlias("  Болгарка  ")).toBe("болгарка");
    expect(normalizeAlias("тёплая")).toBe("теплая");
  });

  it("stems russian tokens", () => {
    expect(stemToken("тепловые")).toMatch(/^тепл/);
    expect(stemToken("пушки")).toMatch(/^пушк?/);
  });
});

describe("CategoryMatcher", () => {
  it("ranks тепловая пушка → Тепловые пушки first", () => {
    const hits = matchProductTypes("Тепловая пушка Ballu 5 кВт", candidates, {
      limit: 5,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].productTypeId).toBe("pt-heat");
    expect(hits[0].confidence).toBeGreaterThan(0.5);
    expect(hits[0].matchedTerms.length).toBeGreaterThan(0);
  });

  it("maps болгарка → УШМ via alias", () => {
    const hits = matchProductTypes("болгарка makita", candidates);
    expect(hits[0]?.productTypeId).toBe("pt-ag");
  });

  it("returns empty for blank query", () => {
    expect(matchProductTypes("  ", candidates)).toEqual([]);
  });
});

describe("characteristic validation", () => {
  const defs = [
    {
      id: "d1",
      name: "Мощность",
      slug: "power",
      type: "NUMBER" as const,
      required: true,
    },
    {
      id: "d2",
      name: "Тип нагрева",
      slug: "heat",
      type: "SELECT" as const,
      required: true,
      options: ["электрический", "газовый"],
    },
  ];

  it("blocks ACTIVE when required missing", () => {
    const issues = validateCharacteristicValues(defs, []);
    expect(issues).toHaveLength(2);
    expect(canPublishActive(defs, []).ok).toBe(false);
  });

  it("passes when required filled", () => {
    const values = [
      { definitionId: "d1", valueNumber: 5 },
      { definitionId: "d2", valueText: "электрический" },
    ];
    expect(validateCharacteristicValues(defs, values)).toEqual([]);
    expect(canPublishActive(defs, values).ok).toBe(true);
  });
});
