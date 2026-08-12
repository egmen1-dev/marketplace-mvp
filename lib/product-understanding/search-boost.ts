/**
 * Search ranking weights for brand/model signals (foundation for A-005+).
 * Matcher (matchProductTypes) is unchanged — these boosts apply to catalog search.
 */

export const SEARCH_SIGNAL_WEIGHTS = {
  title: 1.0,
  brandExact: 1.35,
  brandAlias: 1.2,
  modelExact: 1.4,
  productTypeAlias: 1.15,
  characteristicValue: 0.9,
  description: 0.55,
} as const;

/**
 * Heuristic score contribution when a query token hits a product field.
 * Used for docs / future ranked search — listing still uses Prisma contains OR.
 */
export function brandModelBoostHint(input: {
  queryToken: string;
  brandName?: string | null;
  brandAliases?: string[];
  modelName?: string | null;
}): number {
  const q = input.queryToken.trim().toLowerCase();
  if (!q) return 0;
  let boost = 0;
  if (input.brandName && input.brandName.toLowerCase() === q) {
    boost += SEARCH_SIGNAL_WEIGHTS.brandExact;
  } else if (
    input.brandAliases?.some((a) => a.toLowerCase() === q) ||
    (input.brandName && input.brandName.toLowerCase().includes(q))
  ) {
    boost += SEARCH_SIGNAL_WEIGHTS.brandAlias;
  }
  if (input.modelName) {
    const m = input.modelName.toLowerCase().replace(/\s+/g, "");
    const t = q.replace(/\s+/g, "");
    if (m === t || m.includes(t)) boost += SEARCH_SIGNAL_WEIGHTS.modelExact;
  }
  return boost;
}
