import { ProductStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assertActivePublishRequirements,
  catalogSourceLabel,
  computeCategoryPath,
  invalidateTaxonomyCache,
  matchProductTypes,
  resolveCatalogSourceOrigin,
  type MatchCandidate,
} from "@/lib/catalog-taxonomy";

describe("Catalog Core — category path", () => {
  it("computes materialized path", () => {
    expect(computeCategoryPath("tools", null)).toBe("tools");
    expect(computeCategoryPath("drills", "tools/power-tools")).toBe(
      "tools/power-tools/drills",
    );
  });
});

describe("Catalog Core — slug dedup base", () => {
  it("only strips -lot- sync suffixes", async () => {
    const { baseSlugForDedup } = await import("@/lib/catalog-taxonomy/unify");
    expect(baseSlugForDedup("drills-lot-drills")).toBe("drills");
    expect(baseSlugForDedup("home-textile")).toBe("home-textile");
    expect(baseSlugForDedup("clothing-accessories")).toBe("clothing-accessories");
    expect(baseSlugForDedup("home")).toBe("home");
  });
});

describe("Catalog Core — source origin", () => {
  it("maps externalSource to admin labels", () => {
    expect(resolveCatalogSourceOrigin("wildberries")).toBe("WB");
    expect(resolveCatalogSourceOrigin("snapshot")).toBe("SNAPSHOT");
    expect(resolveCatalogSourceOrigin("manual")).toBe("MANUAL");
    expect(resolveCatalogSourceOrigin(null)).toBe("LOCAL");
    expect(catalogSourceLabel("snapshot")).toBe("Снимок");
  });
});

describe("Catalog Core — ACTIVE publish hardening", () => {
  it("blocks ACTIVE without ProductType", () => {
    const blocked = assertActivePublishRequirements({
      status: ProductStatus.ACTIVE,
      productTypeId: null,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.code).toBe("PRODUCT_TYPE_REQUIRED");
    }
  });

  it("allows DRAFT without ProductType", () => {
    expect(
      assertActivePublishRequirements({
        status: ProductStatus.DRAFT,
        productTypeId: null,
      }).ok,
    ).toBe(true);
  });

  it("allows ACTIVE with ProductType", () => {
    expect(
      assertActivePublishRequirements({
        status: ProductStatus.ACTIVE,
        productTypeId: "cuid1234567890123456789012",
      }).ok,
    ).toBe(true);
  });
});

describe("Catalog Core — matcher after unification", () => {
  const candidates: MatchCandidate[] = [
    {
      productTypeId: "pt-drills",
      name: "Дрели",
      slug: "drills",
      categoryId: "cat-power",
      breadcrumb: ["Инструменты", "Электроинструмент", "Дрели"],
      aliases: ["дрель", "ударная дрель"],
    },
    {
      productTypeId: "pt-rh",
      name: "Перфораторы",
      slug: "rotary-hammers",
      categoryId: "cat-power",
      breadcrumb: ["Инструменты", "Электроинструмент", "Перфораторы"],
      aliases: ["перфоратор"],
    },
  ];

  it("suggests perforator product type from title", () => {
    const hits = matchProductTypes("Перфоратор Makita HR2470 780Вт", candidates);
    expect(hits[0]?.productTypeId).toBe("pt-rh");
    expect(hits[0]?.confidence).toBeGreaterThan(0.3);
  });
});

describe("Catalog Core — taxonomy cache", () => {
  it("invalidate clears cache without error", () => {
    expect(() => invalidateTaxonomyCache()).not.toThrow();
  });
});

describe("createProductSchema — ProductType required for ACTIVE", () => {
  it("rejects ACTIVE without productTypeId", async () => {
    const { createProductSchema } = await import("@/features/products/schemas");
    const result = createProductSchema.safeParse({
      title: "Test product",
      price: 100,
      status: ProductStatus.ACTIVE,
      productTypeId: null,
    });
    expect(result.success).toBe(false);
  });
});
