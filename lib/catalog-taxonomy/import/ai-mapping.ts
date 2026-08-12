/**
 * AI-assisted mapping foundation (rules-v1).
 * Suggests WB/LOT ProductType mappings — never auto-applies.
 */

import { normalizeAlias, stemToken } from "../normalize";

export type ProductTypeMappingSuggestion = {
  incomingName: string;
  incomingSlug: string;
  incomingExternalId: string;
  targetId: string | null;
  targetName: string | null;
  targetSlug: string | null;
  confidence: number;
  reason: string;
};

type LotType = {
  id: string;
  name: string;
  lotName: string | null;
  slug: string;
  aliases: string[];
};

export function suggestProductTypeMapping(
  incoming: { name: string; slug: string; externalId: string; aliases?: string[] },
  lotTypes: LotType[],
): ProductTypeMappingSuggestion {
  const inName = normalizeAlias(incoming.name);
  const inSlug = normalizeAlias(incoming.slug);
  const inAliases = new Set(
    [incoming.name, ...(incoming.aliases ?? [])].map((a) => normalizeAlias(a)),
  );

  let best: ProductTypeMappingSuggestion | null = null;

  for (const t of lotTypes) {
    const names = [
      t.name,
      t.lotName ?? "",
      ...t.aliases,
    ].map((x) => normalizeAlias(x)).filter(Boolean);

    if (normalizeAlias(t.slug) === inSlug) {
      return {
        incomingName: incoming.name,
        incomingSlug: incoming.slug,
        incomingExternalId: incoming.externalId,
        targetId: t.id,
        targetName: t.lotName ?? t.name,
        targetSlug: t.slug,
        confidence: 0.97,
        reason: "exact slug",
      };
    }

    if (names.some((n) => n === inName)) {
      const hit = {
        incomingName: incoming.name,
        incomingSlug: incoming.slug,
        incomingExternalId: incoming.externalId,
        targetId: t.id,
        targetName: t.lotName ?? t.name,
        targetSlug: t.slug,
        confidence: 0.94,
        reason: "exact name",
      };
      if (!best || hit.confidence > best.confidence) best = hit;
      continue;
    }

    if (names.some((n) => inAliases.has(n))) {
      const hit = {
        incomingName: incoming.name,
        incomingSlug: incoming.slug,
        incomingExternalId: incoming.externalId,
        targetId: t.id,
        targetName: t.lotName ?? t.name,
        targetSlug: t.slug,
        confidence: 0.9,
        reason: "shared alias",
      };
      if (!best || hit.confidence > best.confidence) best = hit;
      continue;
    }

    const inStem = stemToken(inName);
    for (const n of names) {
      const s = stemToken(n);
      if (inStem.length >= 4 && s.length >= 4 && (inStem === s || inStem.includes(s) || s.includes(inStem))) {
        const hit = {
          incomingName: incoming.name,
          incomingSlug: incoming.slug,
          incomingExternalId: incoming.externalId,
          targetId: t.id,
          targetName: t.lotName ?? t.name,
          targetSlug: t.slug,
          confidence: 0.78,
          reason: "similar stem (AI rules-v1)",
        };
        if (!best || hit.confidence > best.confidence) best = hit;
      }
    }
  }

  return (
    best ?? {
      incomingName: incoming.name,
      incomingSlug: incoming.slug,
      incomingExternalId: incoming.externalId,
      targetId: null,
      targetName: null,
      targetSlug: null,
      confidence: 0.2,
      reason: "no mapping — manual review",
    }
  );
}

/** Classic synonym example for docs/tests: УШМ ↔ болгарка */
export const PRODUCT_TYPE_SYNONYMS: Array<[string, string]> = [
  ["ушм", "болгарка"],
  ["угловая шлифмашина", "болгарка"],
  ["перфоратор", "rotary hammer"],
];

export function synonymBoost(a: string, b: string): number {
  const na = normalizeAlias(a);
  const nb = normalizeAlias(b);
  for (const [x, y] of PRODUCT_TYPE_SYNONYMS) {
    if ((na.includes(x) && nb.includes(y)) || (na.includes(y) && nb.includes(x))) {
      return 0.98;
    }
  }
  return 0;
}
