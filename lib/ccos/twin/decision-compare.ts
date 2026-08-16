import type { DecisionComparisonRow, TwinResult } from "./types";

export function compareDecisionScenarios(results: TwinResult[]): DecisionComparisonRow[] {
  const ranked = [...results].sort((a, b) => {
    const scoreA =
      (a.predicted.positionDelta ?? 0) * 2 +
      (a.predicted.ctrDeltaPct ?? 0) * 0.5 +
      (a.predicted.revenueDeltaPct ?? 0) * 0.3 -
      a.risk.score * 0.05;
    const scoreB =
      (b.predicted.positionDelta ?? 0) * 2 +
      (b.predicted.ctrDeltaPct ?? 0) * 0.5 +
      (b.predicted.revenueDeltaPct ?? 0) * 0.3 -
      b.risk.score * 0.05;
    return scoreB - scoreA;
  });

  return ranked.map((r, index) => ({
    scenarioId: r.scenarioId,
    label: r.scenarioLabel,
    positionDelta: r.predicted.positionDelta ?? null,
    ctrDeltaPct: r.predicted.ctrDeltaPct ?? null,
    revenueDeltaPct: r.predicted.revenueDeltaPct ?? null,
    riskScore: r.risk.score,
    confidence: r.confidence.overall,
    rank: index + 1,
  }));
}

export function pickBestScenarioId(comparison: DecisionComparisonRow[]): string | null {
  return comparison[0]?.scenarioId ?? null;
}
