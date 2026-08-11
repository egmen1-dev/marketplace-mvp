import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeQuery, type SearchLexicon } from "@/lib/search-intelligence";

/**
 * Server search lexicon (AGENT-020): ProductType names/aliases + category names
 * from the DB, used by the parser for spell correction + taxonomy expansion.
 * Cached in-process with a short TTL to avoid per-request N+1.
 */

let cache: { value: SearchLexicon; at: number } | null = null;
const TTL_MS = 5 * 60_000;

export async function getSearchLexicon(): Promise<SearchLexicon> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const [types, aliases, categories] = await Promise.all([
    prisma.productType.findMany({
      where: { isActive: true },
      select: { name: true, lotName: true },
    }),
    prisma.productTypeAlias.findMany({ select: { normalized: true, alias: true } }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { name: true },
    }),
  ]);

  const productTypeTerms = new Set<string>();
  for (const t of types) {
    productTypeTerms.add(normalizeQuery(t.lotName ?? t.name));
    productTypeTerms.add(normalizeQuery(t.name));
  }
  for (const a of aliases) {
    productTypeTerms.add(a.normalized || normalizeQuery(a.alias));
  }

  const categoryTerms = new Set<string>();
  for (const c of categories) categoryTerms.add(normalizeQuery(c.name));

  const value: SearchLexicon = {
    productTypeTerms: [...productTypeTerms].filter(Boolean),
    categoryTerms: [...categoryTerms].filter(Boolean),
  };
  cache = { value, at: Date.now() };
  return value;
}

/** Test/ops helper to invalidate the cache after taxonomy changes. */
export function clearSearchLexiconCache(): void {
  cache = null;
}
