import type { PriorityRecommendation } from "./types";

/** Wrap priority action with explicit Why / Benefit / How structure. */
export function explainRecommendation(
  rec: PriorityRecommendation,
): PriorityRecommendation {
  return {
    ...rec,
    why: rec.why.trim(),
    benefit: rec.benefit.trim(),
    howTo: rec.howTo.trim(),
  };
}

export function formatOneActionHeadline(rec: PriorityRecommendation): string {
  return `Ваш следующий лучший шаг: ${rec.action.toLowerCase()}`;
}
