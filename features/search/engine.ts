import "server-only";

import { parseSearchQuery, type ParsedQuery } from "@/lib/search-intelligence";
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
};

export async function expandSearch(query: string): Promise<SearchExpansion> {
  const lexicon = await getSearchLexicon();
  const parsed = parseSearchQuery(query, { lexicon });

  const terms = new Set<string>();
  for (const t of parsed.tokens) if (t) terms.add(t);
  for (const c of parsed.corrections) if (c.to) terms.add(c.to);
  for (const s of parsed.synonyms) if (s) terms.add(s);
  for (const b of parsed.brands) if (b) terms.add(b);
  for (const m of parsed.models) if (m) terms.add(m.toLowerCase());

  return { parsed, terms: [...terms] };
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
