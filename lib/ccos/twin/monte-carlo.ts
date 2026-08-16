import type { TwinMonteCarloResult, TwinResult } from "./types";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function runMonteCarloSimulation(input: {
  iterations?: number;
  baseResult: Pick<TwinResult, "predicted">;
  noiseScale?: number;
}): TwinMonteCarloResult {
  const iterations = input.iterations ?? 48;
  const noise = input.noiseScale ?? 0.12;
  const positionDeltas: number[] = [];
  const ctrDeltas: number[] = [];
  const convDeltas: number[] = [];
  const revenueDeltas: number[] = [];

  for (let i = 0; i < iterations; i += 1) {
    const factor = 1 + (Math.random() * 2 - 1) * noise;
    positionDeltas.push((input.baseResult.predicted.positionDelta ?? 0) * factor);
    ctrDeltas.push((input.baseResult.predicted.ctrDeltaPct ?? 0) * factor);
    convDeltas.push((input.baseResult.predicted.conversionDeltaPct ?? 0) * factor);
    revenueDeltas.push((input.baseResult.predicted.revenueDeltaPct ?? 0) * factor);
  }

  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };

  const positionUnder20 = positionDeltas.filter((d) => {
    const pos = (input.baseResult.predicted.position ?? 30) - d;
    return pos < 20;
  }).length;

  return {
    iterations,
    probabilities: {
      positionUnder20: clamp01(positionUnder20 / iterations),
      ctrGrowth: clamp01(ctrDeltas.filter((v) => v > 0).length / iterations),
      conversionGrowth: clamp01(convDeltas.filter((v) => v > 0).length / iterations),
      revenueGrowth: clamp01(revenueDeltas.filter((v) => v > 0).length / iterations),
    },
    median: {
      positionDelta: Math.round(median(positionDeltas) * 10) / 10,
      ctrDeltaPct: Math.round(median(ctrDeltas) * 10) / 10,
      conversionDeltaPct: Math.round(median(convDeltas) * 10) / 10,
      revenueDeltaPct: Math.round(median(revenueDeltas) * 10) / 10,
    },
  };
}
