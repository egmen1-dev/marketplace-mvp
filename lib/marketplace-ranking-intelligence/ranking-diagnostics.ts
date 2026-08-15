import type { AdminRankingDashboard } from "./types";

export function deriveRankingHealth(input: {
  marketplaceAverage: number;
  notEligibleRatio: number;
}): AdminRankingDashboard["rankingHealth"] {
  if (input.marketplaceAverage >= 70 && input.notEligibleRatio < 0.2) return "good";
  if (input.marketplaceAverage >= 55 && input.notEligibleRatio < 0.35) return "attention";
  return "critical";
}

export function aggregateFailureReasons(
  rows: Array<{ reasons: string[] }>,
): Array<{ reason: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const reason of row.reasons) {
      map.set(reason, (map.get(reason) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
