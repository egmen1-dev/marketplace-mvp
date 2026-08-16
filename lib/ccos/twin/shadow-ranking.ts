/**
 * Shadow Ranking — copy of ranking score algorithm for Twin only.
 * Production resolveOrderBy() is never invoked from this module.
 */
import { computeRankingScore } from "@/lib/marketplace-ranking-intelligence/ranking-score";
import { estimatePosition } from "@/lib/marketplace-ranking-intelligence/ranking-simulator";
import type { RankingProductInput, RankingWeightRow } from "@/lib/marketplace-ranking-intelligence/types";

export const SHADOW_RANKING_VERSION = "shadow-ranking-v1";

export function shadowRankingScore(
  input: RankingProductInput,
  weights: RankingWeightRow[],
): { overall: number; position: number | null } {
  const score = computeRankingScore(input, weights);
  return { overall: score.overall, position: null };
}

export function shadowRankingSimulate(input: {
  baseline: RankingProductInput;
  simulated: RankingProductInput;
  peerScores: number[];
  weights: RankingWeightRow[];
}): {
  currentScore: number;
  predictedScore: number;
  currentPosition: number | null;
  predictedPosition: number | null;
  positionDelta: number | null;
  scoreDelta: number;
} {
  const current = computeRankingScore(input.baseline, input.weights);
  const predicted = computeRankingScore(input.simulated, input.weights);

  const currentPosition = estimatePosition(current.overall, input.peerScores, input.baseline.id);
  const predictedPosition = estimatePosition(
    predicted.overall,
    [...input.peerScores.filter((s) => s !== current.overall), predicted.overall],
    input.baseline.id,
  );

  const positionDelta =
    currentPosition != null && predictedPosition != null
      ? currentPosition - predictedPosition
      : null;

  return {
    currentScore: current.overall,
    predictedScore: predicted.overall,
    currentPosition,
    predictedPosition,
    positionDelta,
    scoreDelta: predicted.overall - current.overall,
  };
}

export function estimateBehaviourDeltas(input: {
  baseline: RankingProductInput;
  scoreDelta: number;
  positionDelta: number | null;
}): { ctrDeltaPct: number; conversionDeltaPct: number; revenueDeltaPct: number } {
  const views = Math.max(1, input.baseline.views);
  const baseCtr = (input.baseline.favoritesCount / views) * 100;
  const baseConv = (input.baseline.ordersCount / views) * 100;

  const positionBoost = (input.positionDelta ?? 0) * 0.8;
  const scoreBoost = input.scoreDelta * 0.12;

  const ctrDeltaPct = Math.round((positionBoost + scoreBoost * 0.6) * 10) / 10;
  const conversionDeltaPct = Math.round((positionBoost * 0.45 + scoreBoost * 0.35) * 10) / 10;
  const revenueDeltaPct = Math.round((ctrDeltaPct * 0.4 + conversionDeltaPct * 0.6) * 10) / 10;

  void baseCtr;
  void baseConv;

  return { ctrDeltaPct, conversionDeltaPct, revenueDeltaPct };
}
