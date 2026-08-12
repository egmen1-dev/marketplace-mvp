import { describe, expect, it } from "vitest";

import { computeProductCompletenessScore } from "@/lib/conversion/completeness";

describe("ProductCompletenessScore", () => {
  it("scores a full listing near 100", () => {
    const result = computeProductCompletenessScore({
      photoCount: 3,
      titleLength: 24,
      descriptionLength: 140,
      characteristicCount: 4,
      hasCategory: true,
      hasProductType: true,
      price: 1990,
      hasSeller: true,
    });
    expect(result.score).toBe(100);
    expect(result.improvements).toHaveLength(0);
  });

  it("penalizes missing photos and characteristics", () => {
    const result = computeProductCompletenessScore({
      photoCount: 0,
      titleLength: 12,
      descriptionLength: 0,
      characteristicCount: 0,
      hasCategory: true,
      hasProductType: false,
      price: 100,
      hasSeller: true,
    });
    expect(result.score).toBeLessThan(60);
    expect(result.factors.find((f) => f.key === "photos")?.ok).toBe(false);
    expect(result.improvements.some((h) => /фото/i.test(h))).toBe(true);
    expect(result.improvements.some((h) => /характеристик/i.test(h))).toBe(true);
  });

  it("weights match the epic caps", () => {
    const empty = computeProductCompletenessScore({
      photoCount: 0,
      titleLength: 0,
      descriptionLength: 0,
      characteristicCount: 0,
      hasCategory: false,
      price: 0,
      hasSeller: false,
    });
    expect(empty.score).toBe(0);
    const maxes = Object.fromEntries(
      empty.factors.map((f) => [f.key, f.max]),
    );
    expect(maxes).toEqual({
      photos: 25,
      title: 15,
      description: 10,
      characteristics: 20,
      category: 10,
      price: 10,
      seller: 10,
    });
  });
});
