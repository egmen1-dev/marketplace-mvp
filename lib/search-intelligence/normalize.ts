/**
 * Query normalization (AGENT-020, section 4). Case, spaces, hyphens, ё→е,
 * common keyboard-layout mistypes (latin typed instead of cyrillic), light
 * singular/plural + abbreviation folding.
 */

/** QWERTY(latin) → ЙЦУКЕН(cyrillic) map for accidental wrong-layout input. */
const LAYOUT_MAP: Record<string, string> = {
  q: "й", w: "ц", e: "у", r: "к", t: "е", y: "н", u: "г", i: "ш", o: "щ",
  p: "з", a: "ф", s: "ы", d: "в", f: "а", g: "п", h: "р", j: "о", k: "л",
  l: "д", z: "я", x: "ч", c: "с", v: "м", b: "и", n: "т", m: "ь",
};

/** Base normalization: lowercase, ё→е, collapse spaces, unify hyphens. */
export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'`]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fix a token typed in the wrong (latin) keyboard layout. */
export function fixLayout(token: string): string {
  if (!/^[a-z-]+$/.test(token)) return token; // has digits/cyrillic → keep
  const mapped = token
    .split("")
    .map((ch) => LAYOUT_MAP[ch] ?? ch)
    .join("");
  return mapped;
}

const ABBREVIATIONS: Record<string, string> = {
  ушм: "ушм",
  акб: "аккумулятор",
  бу: "б/у",
  квт: "квт",
};

/** Light singular fold — strips a few common RU plural endings for matching. */
export function singularize(token: string): string {
  const t = token;
  if (t.length < 5) return t;
  for (const end of ["ами", "ями", "ов", "ев", "ыe", "ие", "ы", "и", "а", "я"]) {
    if (t.endsWith(end) && t.length - end.length >= 4) {
      return t.slice(0, -end.length);
    }
  }
  return t;
}

/** Tokenize a normalized query into content tokens (≥1 char). */
export function tokenize(normalized: string): string[] {
  return normalized
    .split(/[\s,/()]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function expandAbbrev(token: string): string {
  return ABBREVIATIONS[token] ?? token;
}
