/**
 * DuplicateListingDetector (AGENT-019, section 20). Text-only first pass (no image
 * AI). Flags near-identical listings by the SAME seller: similar title + same
 * ProductType + similar price + similar description. Never deletes automatically —
 * it only returns a duplicate-candidate score.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length >= 2));
}

/** Jaccard similarity of two token sets (0..1). */
export function textSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type ListingLike = {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  productTypeId?: string | null;
};

export type DuplicateResult = {
  score: number; // 0..100 duplicate-candidate score
  confidence: number;
  reason: string;
  matchId: string | null;
};

/** Compare a candidate against the same seller's existing listings. */
export function detectDuplicateListing(
  candidate: ListingLike,
  existing: ListingLike[],
): DuplicateResult {
  let best: { id: string; score: number; titleSim: number } | null = null;

  for (const e of existing) {
    if (e.id === candidate.id) continue;
    const titleSim = textSimilarity(candidate.title, e.title);
    const descSim = textSimilarity(candidate.description ?? "", e.description ?? "");
    const sameType =
      candidate.productTypeId != null && candidate.productTypeId === e.productTypeId;
    const priceClose =
      e.price > 0 && Math.abs(candidate.price - e.price) / e.price <= 0.1;

    // Weighted: title dominates; type/price/description reinforce.
    const raw =
      titleSim * 60 +
      descSim * 15 +
      (sameType ? 15 : 0) +
      (priceClose ? 10 : 0);

    if (!best || raw > best.score) best = { id: e.id, score: raw, titleSim };
  }

  if (!best || best.score < 55) {
    return { score: 0, confidence: 40, reason: "Дублей не обнаружено", matchId: null };
  }

  return {
    score: Math.round(Math.min(100, best.score)),
    confidence: Math.round(Math.min(100, best.titleSim * 100)),
    reason: "Похожее объявление того же продавца",
    matchId: best.id,
  };
}
