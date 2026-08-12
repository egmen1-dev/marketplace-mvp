/**
 * Normalize inbound taxonomy payloads to Catalog Core conventions.
 */

import { createHash } from "node:crypto";

import { normalizeAlias, slugifyRu } from "../normalize";
import type {
  NormalizedCategory,
  NormalizedCharacteristic,
  NormalizedProductType,
  NormalizedTaxonomy,
} from "../types";

/** Known characteristic name aliases → canonical LOT slug hint. */
export const CHARACTERISTIC_NAME_ALIASES: Record<string, string> = {
  мощность: "power",
  "мощность двигателя": "power",
  "мощность номинальная": "power",
  напряжение: "voltage",
  вес: "weight",
  цвет: "color",
  размер: "size",
  материал: "material",
  бренд: "brand",
  производитель: "brand",
};

export function canonicalizeCharacteristicName(name: string): {
  name: string;
  slugHint: string;
} {
  const n = normalizeAlias(name);
  const mapped = CHARACTERISTIC_NAME_ALIASES[n];
  if (mapped) {
    return {
      name: name.trim(),
      slugHint: mapped,
    };
  }
  return { name: name.trim(), slugHint: slugifyRu(name) };
}

export function normalizeIncomingTaxonomy(
  raw: NormalizedTaxonomy,
): NormalizedTaxonomy {
  const categories: NormalizedCategory[] = raw.categories.map((c) => ({
    ...c,
    name: c.name.trim(),
    slug: slugifyRu(c.slug || c.name).slice(0, 80),
    path: c.path
      .split("/")
      .map((p) => slugifyRu(p))
      .filter(Boolean)
      .join("/"),
    externalName: (c.externalName || c.name).trim(),
  }));

  const productTypes: NormalizedProductType[] = raw.productTypes.map((pt) => {
    const aliases = [
      ...(pt.aliases ?? []),
      pt.name,
      pt.externalName,
    ]
      .map((a) => a?.trim())
      .filter((a): a is string => Boolean(a))
      .map((a) => a);
    const uniqAliases = [...new Set(aliases)];

    const characteristics: NormalizedCharacteristic[] = pt.characteristics.map(
      (ch, idx) => {
        const canon = canonicalizeCharacteristicName(ch.name);
        return {
          ...ch,
          name: canon.name,
          slug: ch.slug?.trim()
            ? slugifyRu(ch.slug).slice(0, 80)
            : slugifyRu(canon.slugHint).slice(0, 80),
          sortOrder: ch.sortOrder ?? idx,
          unit: ch.unit ?? null,
          options: ch.options ?? null,
        };
      },
    );

    return {
      ...pt,
      name: pt.name.trim(),
      slug: slugifyRu(pt.slug || pt.name).slice(0, 80),
      externalName: (pt.externalName || pt.name).trim(),
      aliases: uniqAliases,
      characteristics,
    };
  });

  return {
    source: raw.source,
    fetchedAt: raw.fetchedAt || new Date().toISOString(),
    categories,
    productTypes,
  };
}

export function taxonomyContentHash(taxonomy: NormalizedTaxonomy): string {
  const payload = JSON.stringify({
    source: taxonomy.source,
    categories: taxonomy.categories.map((c) => ({
      e: c.externalId,
      s: c.slug,
      n: c.name,
      p: c.parentKey,
    })),
    productTypes: taxonomy.productTypes.map((pt) => ({
      e: pt.externalId,
      s: pt.slug,
      n: pt.name,
      c: pt.categoryKey,
      a: pt.aliases ?? [],
      ch: pt.characteristics.map((x) => ({
        e: x.externalId,
        s: x.slug,
        n: x.name,
        t: x.type,
      })),
    })),
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function taxonomyVersion(taxonomy: NormalizedTaxonomy): string {
  const day = (taxonomy.fetchedAt || new Date().toISOString()).slice(0, 10);
  return `${taxonomy.source}-${day}`;
}
