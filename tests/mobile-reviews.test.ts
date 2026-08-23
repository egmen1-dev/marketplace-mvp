import { describe, expect, it } from "vitest";

import { enrichItemsWithRatings } from "@/lib/marketplace-trust-loop/ratings/batch-ratings";

describe("mobile product reviews", () => {
  it("enriches catalog items with batch ratings without per-card requests", () => {
    const items = [{ id: "p1", title: "A" }, { id: "p2", title: "B" }];
    const map = new Map([
      ["p1", { averageRating: 4.8, reviewsCount: 127 }],
    ]);
    const enriched = enrichItemsWithRatings(items, map);
    expect(enriched[0].averageRating).toBe(4.8);
    expect(enriched[0].reviewsCount).toBe(127);
    expect(enriched[1].averageRating).toBeNull();
    expect(enriched[1].reviewsCount).toBe(0);
  });

  it("keeps null rating for products without approved reviews", () => {
    const enriched = enrichItemsWithRatings([{ id: "x", title: "X" }], new Map());
    expect(enriched[0].averageRating).toBeNull();
    expect(enriched[0].reviewsCount).toBe(0);
  });
});
