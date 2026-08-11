/**
 * Deterministic CategoryMatcher — scores ProductType candidates from title tokens,
 * names, aliases, and lightweight RU stemming. No fake confidence.
 */

import { normalizeAlias, stemToken, tokenizeQuery } from "./normalize";
import type { MatchCandidate, MatchResult } from "./types";

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

function tokenHits(
  haystack: string,
  queryTokens: string[],
): { score: number; matched: string[] } {
  const hay = normalizeAlias(haystack);
  const hayTokens = tokenizeQuery(haystack);
  const hayStems = hayTokens.map(stemToken);
  const matched: string[] = [];
  let score = 0;

  for (const qt of queryTokens) {
    const qs = stemToken(qt);
    if (hay.includes(qt) || hayTokens.some((t) => t === qt || t.startsWith(qs) || qs.startsWith(t.slice(0, qs.length)))) {
      matched.push(qt);
      score += qt.length >= 5 ? 3 : 2;
      continue;
    }
    if (hayStems.some((hs) => hs === qs || (hs.length >= 3 && (hs.startsWith(qs) || qs.startsWith(hs))))) {
      matched.push(qt);
      score += 1.5;
    }
  }

  return { score, matched: unique(matched) };
}

/**
 * Bonus when a whole alias / name phrase appears verbatim in the query
 * (or the query appears in the phrase). Rewards «тепловая пушка» → alias
 * "тепловая пушка" over a single-token stem overlap on a sibling type.
 */
function phraseBonus(phrase: string, normQuery: string): number {
  const p = normalizeAlias(phrase);
  if (p.length < 4) return 0;
  const pWords = p.split(" ").filter(Boolean).length;
  if (normQuery.includes(p)) {
    // Multi-word exact phrase is a very strong signal.
    return pWords >= 2 ? 8 : 4;
  }
  if (pWords >= 2 && p.includes(normQuery) && normQuery.length >= 4) {
    return 3;
  }
  return 0;
}

/**
 * Rank ProductTypes for a free-text product title.
 * Deterministic scoring (name + alias + breadcrumb token hits, plus verbatim
 * phrase bonuses). Confidence is rawScore / maxPossible (not ML).
 */
export function matchProductTypes(
  title: string,
  candidates: MatchCandidate[],
  options?: { limit?: number },
): MatchResult[] {
  const limit = options?.limit ?? 5;
  const queryTokens = tokenizeQuery(title);
  if (!queryTokens.length || !candidates.length) return [];

  const normQuery = normalizeAlias(title);
  const maxPossible = queryTokens.reduce(
    (sum, t) => sum + (t.length >= 5 ? 3 : 2) * 2,
    0,
  );

  type Scored = MatchResult & { raw: number; nameWords: number };
  const scored: Scored[] = [];

  for (const c of candidates) {
    const nameHit = tokenHits(c.name, queryTokens);
    let aliasBest = { score: 0, matched: [] as string[] };
    let aliasPhrase = 0;
    for (const alias of c.aliases) {
      const hit = tokenHits(alias, queryTokens);
      if (hit.score > aliasBest.score) aliasBest = hit;
      aliasPhrase = Math.max(aliasPhrase, phraseBonus(alias, normQuery));
    }
    const crumbHit = tokenHits(c.breadcrumb.join(" "), queryTokens);
    const namePhrase = phraseBonus(c.name, normQuery);

    // Name weight 2x, alias 1.8x, breadcrumb 0.4x, plus verbatim phrase bonus.
    const raw =
      nameHit.score * 2 +
      aliasBest.score * 1.8 +
      crumbHit.score * 0.4 +
      namePhrase +
      aliasPhrase;
    if (raw <= 0) continue;

    const matchedTerms = unique([
      ...nameHit.matched,
      ...aliasBest.matched,
      ...crumbHit.matched,
    ]);

    const confidence = Math.min(
      0.99,
      Math.round((raw / Math.max(maxPossible, 1)) * 100) / 100,
    );

    scored.push({
      productTypeId: c.productTypeId,
      name: c.name,
      breadcrumb: c.breadcrumb,
      confidence,
      matchedTerms,
      raw,
      nameWords: c.name.split(/\s+/).length,
    });
  }

  scored.sort((a, b) => {
    // Sort by raw (unrounded) score first to avoid coarse-rounding ties.
    if (b.raw !== a.raw) return b.raw - a.raw;
    if (b.matchedTerms.length !== a.matchedTerms.length) {
      return b.matchedTerms.length - a.matchedTerms.length;
    }
    // Prefer tighter name matches (fewer extra words) when scores tie.
    const aExtra = a.nameWords - a.matchedTerms.length;
    const bExtra = b.nameWords - b.matchedTerms.length;
    if (aExtra !== bExtra) return aExtra - bExtra;
    return a.name.localeCompare(b.name, "ru");
  });

  return scored.slice(0, limit).map((s) => ({
    productTypeId: s.productTypeId,
    name: s.name,
    breadcrumb: s.breadcrumb,
    confidence: s.confidence,
    matchedTerms: s.matchedTerms,
  }));
}
