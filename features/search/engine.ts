import "server-only";

import {
  expandSynonyms,
  parseSearchQuery,
  singularize,
  type ParsedQuery,
} from "@/lib/search-intelligence";
import { getSearchLexicon } from "./lexicon";

/**
 * SearchEngine (AGENT-020) — UI-independent orchestration. Turns a raw query into
 * an explainable ParsedQuery plus the set of expanded terms used for candidate
 * generation. Ranking is delegated to LOT Ranking v1 (result ordering).
 */

export type SearchExpansion = {
  parsed: ParsedQuery;
  /** Distinct expanded terms (tokens + corrections + synonyms + brands + models). */
  terms: string[];
  /**
   * Per-content-token groups (AND across groups, OR within a group). Each group
   * is a token + its synonyms — precise for multi-word / exact queries.
   */
  tokenGroups: string[][];
  /** Optional recall boosters (brands, models, phrase synonyms). */
  optional: string[];
};

export async function expandSearch(query: string): Promise<SearchExpansion> {
  const lexicon = await getSearchLexicon();
  const parsed = parseSearchQuery(query, { lexicon });

  const terms = new Set<string>();
  const tokenGroups: string[][] = [];
  for (const t of parsed.tokens) {
    if (!t) continue;
    const group = new Set<string>([t]);
    for (const s of expandSynonyms(t)) group.add(s);
    for (const s of expandSynonyms(singularize(t))) group.add(s);
    tokenGroups.push([...group]);
    for (const g of group) terms.add(g);
  }

  const optional = new Set<string>();
  for (const b of parsed.brands) { optional.add(b); terms.add(b); }
  for (const m of parsed.models) { optional.add(m.toLowerCase()); terms.add(m.toLowerCase()); }
  for (const s of parsed.synonyms) { optional.add(s); terms.add(s); }

  return { parsed, terms: [...terms], tokenGroups, optional: [...optional] };
}

/**
 * Diversify results so a single seller does not fill the page (section 20):
 * greedy round-robin keeping at most `maxRun` consecutive items per seller.
 */
export function diversifyBySeller<T extends { seller: { id: string } }>(
  items: T[],
  maxRun = 2,
): T[] {
  if (items.length <= maxRun) return items;
  const out: T[] = [];
  const pool = [...items];
  let lastSeller: string | null = null;
  let run = 0;
  while (pool.length) {
    let idx = 0;
    if (lastSeller && run >= maxRun) {
      const alt = pool.findIndex((p) => p.seller.id !== lastSeller);
      if (alt >= 0) idx = alt;
    }
    const [picked] = pool.splice(idx, 1);
    if (picked.seller.id === lastSeller) run += 1;
    else {
      lastSeller = picked.seller.id;
      run = 1;
    }
    out.push(picked);
  }
  return out;
}
