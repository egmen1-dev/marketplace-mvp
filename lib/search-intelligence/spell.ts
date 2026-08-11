/**
 * Spell correction (AGENT-020, section 5). Bounded Levenshtein against an
 * injected vocabulary (product types, aliases, synonyms, brands). Conservative:
 * short tokens, brands, numbers and model codes are never "corrected".
 */

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Return a corrected token if a close vocabulary term exists, else the original.
 */
export function correctToken(
  token: string,
  vocabulary: string[],
): { corrected: string; changed: boolean } {
  // Never correct short tokens, numbers, or alphanumeric model codes.
  if (token.length < 4 || /\d/.test(token)) {
    return { corrected: token, changed: false };
  }
  if (vocabulary.includes(token)) return { corrected: token, changed: false };

  const maxDist = token.length <= 6 ? 1 : 2;
  let best: { term: string; dist: number } | null = null;
  for (const term of vocabulary) {
    if (Math.abs(term.length - token.length) > maxDist) continue;
    if (term.includes(" ")) continue; // single-token correction only
    const d = levenshtein(token, term);
    if (d > 0 && d <= maxDist && (!best || d < best.dist)) {
      best = { term, dist: d };
      if (d === 1) break;
    }
  }
  return best
    ? { corrected: best.term, changed: true }
    : { corrected: token, changed: false };
}
