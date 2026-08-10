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
 * Rank ProductTypes for a free-text product title.
 * Confidence is score / maxPossible (deterministic, not ML).
 */
export function matchProductTypes(
  title: string,
  candidates: MatchCandidate[],
  options?: { limit?: number },
): MatchResult[] {
  const limit = options?.limit ?? 5;
  const queryTokens = tokenizeQuery(title);
  if (!queryTokens.length || !candidates.length) return [];

  const maxPossible = queryTokens.reduce(
    (sum, t) => sum + (t.length >= 5 ? 3 : 2) * 2,
    0,
  );

  const scored: MatchResult[] = [];

  for (const c of candidates) {
    const nameHit = tokenHits(c.name, queryTokens);
    let aliasBest = { score: 0, matched: [] as string[] };
    for (const alias of c.aliases) {
      const hit = tokenHits(alias, queryTokens);
      if (hit.score > aliasBest.score) aliasBest = hit;
    }
    const crumbHit = tokenHits(c.breadcrumb.join(" "), queryTokens);

    // Name weight 2x, alias 1.8x, breadcrumb 0.4x
    const raw =
      nameHit.score * 2 + aliasBest.score * 1.8 + crumbHit.score * 0.4;
    if (raw <= 0) continue;

    const matchedTerms = unique([
      ...nameHit.matched,
      ...aliasBest.matched,
      ...crumbHit.matched,
    ]);

    const confidence = Math.min(0.99, Math.round((raw / Math.max(maxPossible, 1)) * 100) / 100);

    scored.push({
      productTypeId: c.productTypeId,
      name: c.name,
      breadcrumb: c.breadcrumb,
      confidence,
      matchedTerms,
    });
  }

  scored.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.name.localeCompare(b.name, "ru");
  });

  return scored.slice(0, limit);
}
