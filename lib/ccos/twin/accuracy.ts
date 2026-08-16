import type { TwinAccuracySummary } from "./types";
import { listTwinMemory } from "./memory";

export function computeTwinAccuracySummary(productId?: string): TwinAccuracySummary {
  const records = listTwinMemory(productId ? { productId } : undefined).filter(
    (r) => r.accuracy != null,
  );

  if (records.length === 0) {
    return { evaluatedCount: 0, meanAccuracy: null, recentErrors: [] };
  }

  const meanAccuracy =
    records.reduce((sum, r) => sum + (r.accuracy ?? 0), 0) / records.length;

  const recentErrors = records
    .filter((r) => (r.accuracy ?? 1) < 0.85)
    .slice(-5)
    .map((r) => ({
      scenarioLabel: r.scenarioLabel,
      predicted: r.predicted.ctrDeltaPct ?? 0,
      actual: r.actualOutcome?.ctrDeltaPct ?? 0,
      accuracy: r.accuracy ?? 0,
    }));

  return {
    evaluatedCount: records.length,
    meanAccuracy: Math.round(meanAccuracy * 100) / 100,
    recentErrors,
  };
}

export function formatAccuracyLine(predicted: number, actual: number, accuracy: number): string {
  return `Prediction CTR ${predicted >= 0 ? "+" : ""}${predicted}% · Reality ${actual >= 0 ? "+" : ""}${actual}% · Accuracy ${Math.round(accuracy * 100)}%`;
}
