import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { NormalizedTaxonomy } from "@/lib/catalog-taxonomy";

describe("taxonomy snapshot", () => {
  const file = path.join(process.cwd(), "data/taxonomy/wb-taxonomy.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as NormalizedTaxonomy;

  it("has hierarchy and heat-gun product type", () => {
    expect(data.categories.length).toBeGreaterThanOrEqual(8);
    expect(data.productTypes.length).toBeGreaterThanOrEqual(5);
    const heat = data.productTypes.find((p) => p.slug === "heat-guns");
    expect(heat).toBeTruthy();
    expect(heat!.characteristics.some((c) => c.required)).toBe(true);
    expect(heat!.aliases?.some((a) => a.includes("пушка"))).toBe(true);
  });

  it("has angle-grinder aliases for болгарка", () => {
    const ag = data.productTypes.find((p) => p.slug === "angle-grinders");
    expect(ag?.aliases?.map((a) => a.toLowerCase())).toContain("болгарка");
  });

  it("category keys are unique", () => {
    const keys = data.categories.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
