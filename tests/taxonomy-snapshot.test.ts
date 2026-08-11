import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { NormalizedTaxonomy } from "@/lib/catalog-taxonomy";

describe("taxonomy snapshot", () => {
  const file = path.join(process.cwd(), "data/taxonomy/wb-taxonomy.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as NormalizedTaxonomy;

  it("is a broad marketplace taxonomy (all segments)", () => {
    // Curated LOT taxonomy must be massive, not a few demo types.
    expect(data.categories.length).toBeGreaterThanOrEqual(25);
    expect(data.productTypes.length).toBeGreaterThanOrEqual(50);
    const heat = data.productTypes.find((p) => p.slug === "heat-guns-type");
    expect(heat).toBeTruthy();
    expect(heat!.characteristics.some((c) => c.required)).toBe(true);
    expect(heat!.aliases?.some((a) => a.includes("пушка"))).toBe(true);
  });

  it("has angle-grinder aliases for болгарка", () => {
    const ag = data.productTypes.find((p) => p.slug === "angle-grinders-type");
    expect(ag?.aliases?.map((a) => a.toLowerCase())).toContain("болгарка");
  });

  it("covers diverse segments (laptop, smartphone, sneakers, perfume)", () => {
    const slugs = new Set(data.productTypes.map((p) => p.slug));
    for (const s of [
      "laptops-type",
      "smartphones-type",
      "sneakers-type",
      "perfume-type",
      "car-compressors-type",
      "dumbbells-type",
    ]) {
      expect(slugs.has(s)).toBe(true);
    }
  });

  it("category keys are unique", () => {
    const keys = data.categories.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
