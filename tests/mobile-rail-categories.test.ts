import { describe, expect, it } from "vitest";

import { selectRailCategories } from "../apps/mobile/src/catalog/rail-categories";

describe("selectRailCategories", () => {
  it("keeps categories with catalogProductCount > 0", () => {
    const items = [
      { id: "a", name: "Климат", catalogProductCount: 16 },
      { id: "b", name: "Женская одежда", catalogProductCount: 0 },
      { id: "c", name: "Компьютеры", catalogProductCount: 1 },
    ];
    const rail = selectRailCategories(items);
    expect(rail.map((c) => c.name)).toEqual(["Климат", "Компьютеры"]);
  });

  it("falls back to productCount when catalogProductCount absent", () => {
    const rail = selectRailCategories([
      { id: "a", name: "A", productCount: 2 },
      { id: "b", name: "B", productCount: 0 },
    ]);
    expect(rail).toHaveLength(1);
    expect(rail[0]?.name).toBe("A");
  });
});
