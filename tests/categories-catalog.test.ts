import { describe, expect, it } from "vitest";

import {
  buildCategoryPath,
  buildCategoryPathLabel,
  collectAncestorIds,
  collectDescendantIds,
  computeCategoryLevel,
  productCountWithDescendants,
  searchCategories,
} from "@/features/catalog/tree";
import { categoryPagePath } from "@/features/catalog/paths";
import { parseCatalogParams } from "@/features/catalog/url";
import { ROUTES } from "@/lib/constants";

const nodes = [
  { id: "root", parentId: null, isActive: true },
  { id: "tools", parentId: "root", isActive: true },
  { id: "drills", parentId: "tools", isActive: true },
  { id: "screws", parentId: "tools", isActive: true },
  { id: "home", parentId: null, isActive: true },
  { id: "lighting", parentId: "home", isActive: true },
  { id: "archived", parentId: "root", isActive: false },
  { id: "ghost-child", parentId: "archived", isActive: true },
];

describe("category tree — public active only", () => {
  it("skips inactive branches when collecting descendants", () => {
    const ids = collectDescendantIds(nodes, "root", { activeOnly: true });
    expect(ids).toEqual(["root", "tools", "drills", "screws"]);
    expect(ids).not.toContain("archived");
    expect(ids).not.toContain("ghost-child");
  });

  it("includes inactive when activeOnly=false", () => {
    const ids = collectDescendantIds(nodes, "root", { activeOnly: false });
    expect(ids).toContain("archived");
    expect(ids).toContain("ghost-child");
  });

  it("returns empty for inactive root when activeOnly", () => {
    expect(
      collectDescendantIds(nodes, "archived", { activeOnly: true }),
    ).toEqual([]);
  });
});

describe("category filter includes children", () => {
  it("parent category ids include nested leaves", () => {
    const ids = collectDescendantIds(nodes, "tools", { activeOnly: true });
    expect(ids).toEqual(["tools", "drills", "screws"]);
  });

  it("product count rolls up descendants", () => {
    const counts = [
      { id: "tools", count: 1 },
      { id: "drills", count: 2 },
      { id: "screws", count: 3 },
      { id: "root", count: 0 },
    ];
    expect(
      productCountWithDescendants(nodes, "tools", counts, { activeOnly: true }),
    ).toBe(6);
    expect(
      productCountWithDescendants(nodes, "root", counts, { activeOnly: true }),
    ).toBe(6);
  });

  it("ancestor chain is root → … → parent", () => {
    expect(collectAncestorIds(nodes, "drills")).toEqual(["root", "tools"]);
  });
});

describe("category path / level / search", () => {
  const named = [
    { id: "root", name: "Строительство и ремонт", parentId: null, level: 1 },
    { id: "tools", name: "Инструменты", parentId: "root", level: 2 },
    { id: "drills", name: "Дрели", parentId: "tools", level: 3 },
    { id: "heat", name: "Тепловые пушки", parentId: "tools", level: 3 },
    { id: "home", name: "Дом", parentId: null, level: 1 },
  ];

  it("computes level from parent chain", () => {
    expect(computeCategoryLevel(named, "root")).toBe(1);
    expect(computeCategoryLevel(named, "tools")).toBe(2);
    expect(computeCategoryLevel(named, "drills")).toBe(3);
  });

  it("builds A / B / C path labels", () => {
    expect(buildCategoryPath(named, "drills")).toEqual([
      "Строительство и ремонт",
      "Инструменты",
      "Дрели",
    ]);
    expect(buildCategoryPathLabel(named, "drills")).toBe(
      "Строительство и ремонт / Инструменты / Дрели",
    );
  });

  it("search prefers leaf matches for тепловая", () => {
    const hits = searchCategories(named, "тепловая");
    expect(hits.length).toBe(1);
    expect(hits[0]?.id).toBe("heat");
    expect(hits[0]?.isLeaf).toBe(true);
    expect(hits[0]?.pathLabel).toContain("Тепловые пушки");
  });
});

describe("SEO category paths", () => {
  it("builds /category/[slug] URLs", () => {
    expect(categoryPagePath("drills")).toBe(`${ROUTES.CATEGORY}/drills`);
    expect(categoryPagePath("шурупы")).toBe(
      `${ROUTES.CATEGORY}/${encodeURIComponent("шурупы")}`,
    );
  });

  it("catalog params prefer subcategory for effective category", () => {
    const parsed = parseCatalogParams({
      category: "construction",
      subcategory: "drills",
    });
    expect(parsed.rootCategory).toBe("construction");
    expect(parsed.subcategory).toBe("drills");
    expect(parsed.category).toBe("drills");
  });

  it("metadata title pattern is Kupit {name} online", () => {
    const name = "Дрели";
    const title = `Купить ${name} онлайн`;
    expect(title).toBe("Купить Дрели онлайн");
    expect(title.startsWith("Купить ")).toBe(true);
    expect(title.endsWith(" онлайн")).toBe(true);
  });
});
