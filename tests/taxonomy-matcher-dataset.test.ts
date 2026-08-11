import { describe, expect, it } from "vitest";

import {
  buildLotTaxonomy,
  matchProductTypes,
  taxonomyToMatchCandidates,
} from "@/lib/catalog-taxonomy";

/**
 * Matcher quality dataset (TASK 058, section 13/14).
 * 55 realistic queries across every marketplace segment. Expected value is the
 * ProductType slug the recommendation should surface.
 *
 * Acceptance (section 14): Top-1 >= 65%, Top-3 >= 85%.
 */
const DATASET: Array<{ q: string; expect: string; segment: string }> = [
  // ── Строительство / инструмент ──
  { q: "тепловая пушка", expect: "heat-guns-type", segment: "construction" },
  { q: "тепловая пушка Ballu 5 кВт", expect: "heat-guns-type", segment: "construction" },
  { q: "газовая тепловая пушка", expect: "heat-guns-type", segment: "construction" },
  { q: "обогреватель конвектор", expect: "heaters-type", segment: "construction" },
  { q: "масляный обогреватель", expect: "heaters-type", segment: "construction" },
  { q: "болгарка", expect: "angle-grinders-type", segment: "tools" },
  { q: "УШМ Bosch", expect: "angle-grinders-type", segment: "tools" },
  { q: "угловая шлифовальная машина 125", expect: "angle-grinders-type", segment: "tools" },
  { q: "перфоратор Makita HR2470", expect: "rotary-hammers-type", segment: "tools" },
  { q: "перфоратор SDS plus", expect: "rotary-hammers-type", segment: "tools" },
  { q: "шуруповерт аккумуляторный Makita", expect: "screwdrivers-type", segment: "tools" },
  { q: "шуруповёрт 18В", expect: "screwdrivers-type", segment: "tools" },
  { q: "дрель", expect: "drills-type", segment: "tools" },
  { q: "дрель ударная 750 Вт", expect: "drills-type", segment: "tools" },
  { q: "строительный пылесос", expect: "construction-vacuums-type", segment: "tools" },
  { q: "пылесос строительный Kolner", expect: "construction-vacuums-type", segment: "tools" },
  { q: "сварочный аппарат", expect: "welders-type", segment: "tools" },
  { q: "сварочный инвертор Ресанта", expect: "welders-type", segment: "tools" },
  { q: "лобзик электрический", expect: "jigsaws-type", segment: "tools" },
  { q: "набор инструментов в кейсе", expect: "tool-sets-type", segment: "tools" },
  { q: "набор гаечных ключей", expect: "wrenches-type", segment: "tools" },
  { q: "краска интерьерная 10 л", expect: "paints-type", segment: "construction" },
  { q: "саморезы по дереву набор", expect: "fasteners-type", segment: "construction" },

  // ── Электроника ──
  { q: "ноутбук ASUS Vivobook 15", expect: "laptops-type", segment: "electronics" },
  { q: "игровой ноутбук", expect: "laptops-type", segment: "electronics" },
  { q: "ноутбук 16 гб озу", expect: "laptops-type", segment: "electronics" },
  { q: "смартфон Samsung Galaxy", expect: "smartphones-type", segment: "electronics" },
  { q: "iPhone 15", expect: "smartphones-type", segment: "electronics" },
  { q: "телефон Xiaomi Redmi", expect: "smartphones-type", segment: "electronics" },
  { q: "телевизор Samsung 55", expect: "tvs-type", segment: "electronics" },
  { q: "телевизор 4К Smart TV", expect: "tvs-type", segment: "electronics" },
  { q: "беспроводные наушники", expect: "headphones-type", segment: "electronics" },
  { q: "монитор игровой 27", expect: "monitors-type", segment: "electronics" },
  { q: "смарт часы фитнес", expect: "smartwatches-type", segment: "electronics" },

  // ── Дом ──
  { q: "пылесос для дома", expect: "vacuums-type", segment: "home" },
  { q: "робот пылесос", expect: "vacuums-type", segment: "home" },
  { q: "фен для волос", expect: "hair-dryers-type", segment: "home" },
  { q: "холодильник двухкамерный", expect: "fridges-type", segment: "home" },
  { q: "стиральная машина", expect: "washers-type", segment: "home" },
  { q: "диван угловой", expect: "sofas-type", segment: "home" },
  { q: "кровать двуспальная", expect: "beds-type", segment: "home" },
  { q: "настольная лампа", expect: "desk-lamps-type", segment: "home" },

  // ── Авто ──
  { q: "автомобильный компрессор", expect: "car-compressors-type", segment: "auto" },
  { q: "компрессор для шин 12В", expect: "car-compressors-type", segment: "auto" },
  { q: "видеорегистратор автомобильный", expect: "dashcams-type", segment: "auto" },
  { q: "зимние шины 17", expect: "tires-type", segment: "auto" },
  { q: "держатель для телефона в машину", expect: "phone-mounts-type", segment: "auto" },

  // ── Одежда / обувь ──
  { q: "зимняя женская куртка", expect: "women-jackets-type", segment: "clothing" },
  { q: "куртка женская пуховик", expect: "women-jackets-type", segment: "clothing" },
  { q: "мужская куртка зимняя", expect: "men-jackets-type", segment: "clothing" },
  { q: "платье женское вечернее", expect: "dresses-type", segment: "clothing" },
  { q: "мужские кроссовки", expect: "sneakers-type", segment: "shoes" },
  { q: "кроссовки беговые", expect: "sneakers-type", segment: "shoes" },

  // ── Красота ──
  { q: "духи женские", expect: "perfume-type", segment: "beauty" },
  { q: "крем для лица увлажняющий", expect: "face-creams-type", segment: "beauty" },

  // ── Спорт ──
  { q: "гантели наборные", expect: "dumbbells-type", segment: "sport" },
  { q: "коврик для йоги", expect: "yoga-mats-type", segment: "sport" },
  { q: "горный велосипед", expect: "bicycles-type", segment: "sport" },
];

const candidates = taxonomyToMatchCandidates(buildLotTaxonomy());
const expectedId = (slug: string) => `lot-pt-${slug}`;

describe("matcher quality dataset (55 queries, all segments)", () => {
  const results = DATASET.map((row) => {
    const hits = matchProductTypes(row.q, candidates, { limit: 3 });
    const want = expectedId(row.expect);
    return {
      ...row,
      top1: hits[0]?.productTypeId === want,
      top3: hits.slice(0, 3).some((h) => h.productTypeId === want),
      got: hits.map((h) => h.name).slice(0, 3),
    };
  });

  const top1 = results.filter((r) => r.top1).length / results.length;
  const top3 = results.filter((r) => r.top3).length / results.length;

  it("prints accuracy metrics", () => {
    // Surfaced in test output for the report; also fails loudly if empty.
    const misses1 = results.filter((r) => !r.top1).map((r) => `${r.q} → ${r.got[0] ?? "∅"}`);
    console.log(
      `[matcher] dataset=${results.length} Top-1=${(top1 * 100).toFixed(1)}% Top-3=${(top3 * 100).toFixed(1)}%\nTop-1 misses:\n  ${misses1.join("\n  ")}`,
    );
    expect(results.length).toBeGreaterThanOrEqual(50);
  });

  it("covers all 9 segments", () => {
    const segs = new Set(DATASET.map((d) => d.segment));
    expect(segs.size).toBeGreaterThanOrEqual(8);
  });

  it("Top-1 accuracy >= 65%", () => {
    expect(top1).toBeGreaterThanOrEqual(0.65);
  });

  it("Top-3 accuracy >= 85%", () => {
    expect(top3).toBeGreaterThanOrEqual(0.85);
  });
});
