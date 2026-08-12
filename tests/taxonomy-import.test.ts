import { describe, expect, it } from "vitest";

import {
  canonicalizeCharacteristicName,
  conflictPriority,
  canSoftDeactivate,
  mapCharacteristicToDefinition,
  normalizeIncomingTaxonomy,
  suggestProductTypeMapping,
  synonymBoost,
  taxonomyContentHash,
} from "@/lib/catalog-taxonomy/import";
import type { NormalizedTaxonomy } from "@/lib/catalog-taxonomy/types";

const sample: NormalizedTaxonomy = {
  source: "snapshot",
  fetchedAt: "2026-08-12T00:00:00.000Z",
  categories: [
    {
      key: "cat:tools",
      name: " Инструменты ",
      slug: "Tools",
      parentKey: null,
      level: 1,
      path: "Tools",
      sortOrder: 0,
      externalSource: "snapshot",
      externalId: "1",
      externalName: "Инструменты",
    },
  ],
  productTypes: [
    {
      key: "pt:angle",
      name: "УШМ",
      slug: "ushm",
      categoryKey: "cat:tools",
      sortOrder: 0,
      externalSource: "snapshot",
      externalId: "10",
      externalName: "УШМ",
      aliases: ["болгарка"],
      characteristics: [
        {
          key: "ch:power",
          name: "Мощность двигателя",
          slug: "power-engine",
          type: "NUMBER",
          required: false,
          sortOrder: 0,
          filterable: true,
          externalId: "100",
          externalSource: "snapshot",
        },
      ],
    },
  ],
};

describe("taxonomy import — normalization", () => {
  it("normalizes slugs/paths and char names", () => {
    const n = normalizeIncomingTaxonomy(sample);
    expect(n.categories[0]?.slug).toBe("tools");
    expect(n.categories[0]?.path).toBe("tools");
    expect(n.productTypes[0]?.characteristics[0]?.slug).toMatch(/power/);
    expect(canonicalizeCharacteristicName("Мощность двигателя").slugHint).toBe(
      "power",
    );
    expect(taxonomyContentHash(n)).toHaveLength(64);
  });
});

describe("taxonomy import — characteristic mapping", () => {
  it("maps мощность двигателя → мощность", () => {
    const mapped = mapCharacteristicToDefinition(
      { name: "Мощность двигателя", slug: "power-engine" },
      [{ id: "d1", name: "Мощность", slug: "power-w", type: "NUMBER" }],
    );
    expect(mapped.targetId).toBe("d1");
    expect(mapped.confidence).toBeGreaterThanOrEqual(0.7);
  });
});

describe("taxonomy import — conflicts", () => {
  it("protects locallyEdited and products", () => {
    expect(
      conflictPriority({ locallyEdited: true }).decision,
    ).toBe("skip_local_edit");
    expect(
      conflictPriority({ productCount: 3 }).decision,
    ).toBe("review_products");
    expect(canSoftDeactivate({ productCount: 2 }).ok).toBe(false);
    expect(canSoftDeactivate({ productCount: 0 }).ok).toBe(true);
  });
});

describe("taxonomy import — AI mapping / synonyms", () => {
  it("boosts УШМ ↔ болгарка", () => {
    expect(synonymBoost("УШМ", "Болгарка")).toBeGreaterThanOrEqual(0.98);
    const suggestion = suggestProductTypeMapping(
      { name: "УШМ", slug: "ushm", externalId: "10", aliases: ["болгарка"] },
      [
        {
          id: "pt1",
          name: "Болгарки",
          lotName: "Болгарки",
          slug: "angle-grinders",
          aliases: ["болгарка", "ушм"],
        },
      ],
    );
    expect(suggestion.targetId).toBe("pt1");
    expect(suggestion.confidence).toBeGreaterThanOrEqual(0.9);
  });
});
