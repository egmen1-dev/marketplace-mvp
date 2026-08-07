/**
 * Lightweight search tokenization for catalog `q`.
 * Helps Russian queries like «дрель» → «Дрели», «тепловая» → «Тепловые».
 */

const RU_ENDINGS = [
  "ями",
  "ами",
  "ую",
  "юю",
  "ая",
  "яя",
  "ое",
  "ее",
  "ые",
  "ие",
  "ой",
  "ей",
  "ий",
  "ый",
  "ов",
  "ев",
  "ам",
  "ям",
  "ом",
  "ем",
  "ах",
  "ях",
  "ью",
  "ию",
  "и",
  "ы",
  "а",
  "я",
  "е",
  "у",
  "ю",
] as const;

/** Split query into meaningful tokens (≥2 chars). */
export function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s,.;:!?\-/\\|+]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Generate match variants for a token (original + stem prefixes).
 * Keeps variants ≥3 chars to avoid overly broad matches.
 */
export function searchTokenVariants(token: string): string[] {
  const base = token.toLowerCase().trim();
  if (!base) return [];

  const variants = new Set<string>([base]);

  for (const end of RU_ENDINGS) {
    if (base.length > end.length + 3 && base.endsWith(end)) {
      const stem = base.slice(0, -end.length);
      if (stem.length >= 3) variants.add(stem);
    }
  }

  if (base.length >= 5) {
    variants.add(base.slice(0, Math.max(4, base.length - 1)));
    variants.add(base.slice(0, Math.max(4, base.length - 2)));
  }

  return [...variants].filter((v) => v.length >= 3);
}
