import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type { RankingProductInput, RankingWeightRow } from "@/lib/marketplace-ranking-intelligence/types";

import { computeFactorContributions } from "./factor-analysis";
import type { LabImportanceRow } from "./types";

type RankedRow = {
  product: RankingProductInput;
  position: number;
};

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]! - mx;
    const y = ys[i]! - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

/**
 * Importance engine — measures how much each factor correlates with position
 * (lower position = better). Normalized to 100%.
 */
export function computeFactorImportance(
  ranked: RankedRow[],
  weights?: RankingWeightRow[],
): LabImportanceRow[] {
  const w = weights ?? DEFAULT_RANKING_WEIGHTS_V1;
  const positionScores = ranked.map((r) => 1000 - r.position + 1);
  const factorKeys = w.map((row) => row.factorKey);

  const raw = factorKeys.map((factorKey) => {
    const label = w.find((row) => row.factorKey === factorKey)?.label ?? factorKey;
    const factorValues = ranked.map((r) => {
      const c = computeFactorContributions(r.product, w).find(
        (x) => x.factorKey === factorKey,
      );
      return c?.points ?? 0;
    });
    const correlation = Math.abs(pearson(factorValues, positionScores));
    const avgContribution =
      Math.round(
        (factorValues.reduce((a, b) => a + b, 0) / Math.max(1, factorValues.length)) * 10,
      ) / 10;
    return {
      factorKey,
      label,
      rawInfluence: correlation,
      avgContribution,
    };
  });

  const total = raw.reduce((s, r) => s + r.rawInfluence, 0) || 1;
  const withFallback = raw.map((r) => {
    const weight = w.find((row) => row.factorKey === r.factorKey)?.weightPercent ?? 5;
    const blended = r.rawInfluence > 0.01 ? r.rawInfluence : weight / 100;
    return { ...r, blended };
  });
  const blendTotal = withFallback.reduce((s, r) => s + r.blended, 0) || 1;

  return withFallback
    .map((r) => ({
      factorKey: r.factorKey,
      label: r.label,
      influencePercent: Math.round((r.blended / blendTotal) * 1000) / 10,
      avgContribution: r.avgContribution,
    }))
    .sort((a, b) => b.influencePercent - a.influencePercent);
}

export function formatImportanceTable(rows: LabImportanceRow[]): string {
  return rows
    .map((r) => `${r.label}\n\n${r.influencePercent}%`)
    .join("\n\n");
}
