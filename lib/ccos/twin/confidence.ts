import type { TwinConfidence } from "./types";

export function computeTwinConfidence(input: {
  sampleSize: number;
  knowledgeCoverage: number;
  graphCoverage: number;
  graphPropagatedConfidence?: number;
  monteCarloStability?: number;
  hasBehaviourData?: boolean;
}): TwinConfidence {
  const sampleFactor = Math.min(1, input.sampleSize / 120);
  const behaviour = input.hasBehaviourData ? 0.12 : 0;
  const stability = input.monteCarloStability ?? 0.65;
  const graphSignal =
    input.graphPropagatedConfidence != null
      ? Math.min(input.graphCoverage, input.graphPropagatedConfidence)
      : input.graphCoverage;

  const rawOverall =
    sampleFactor * 0.25 +
    input.knowledgeCoverage * 0.2 +
    graphSignal * 0.2 +
    stability * 0.25 +
    behaviour;

  const overall = Math.min(
    1,
    input.graphPropagatedConfidence != null
      ? Math.min(rawOverall, input.graphPropagatedConfidence * 1.05)
      : rawOverall,
  );

  const label = overall >= 0.75 ? "high" : overall >= 0.45 ? "medium" : "low";
  const reason =
    label === "high"
      ? "Достаточно данных, graph/knowledge coverage и стабильность Monte Carlo"
      : label === "medium"
        ? "Умеренная выборка — рекомендация не категорична"
        : "Слабые данные — только exploratory simulation";

  return {
    overall,
    reason,
    sampleSize: input.sampleSize,
    knowledgeCoverage: input.knowledgeCoverage,
    graphCoverage: input.graphCoverage,
    label,
  };
}
