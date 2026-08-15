import { applySimulationToInput, computeRankingScore } from "./ranking-score";
import type {
  RankingProductInput,
  RankingSimulateInput,
  RankingSimulationResult,
  RankingWeightRow,
} from "./types";

export function simulateRankingChanges(input: {
  product: RankingProductInput;
  peerScores: number[];
  weights: RankingWeightRow[];
  changes: RankingSimulateInput;
}): RankingSimulationResult {
  const current = computeRankingScore(input.product, input.weights);
  const simulatedProduct = applySimulationToInput(input.product, input.changes);
  const predicted = computeRankingScore(simulatedProduct, input.weights);

  const currentPosition = estimatePosition(current.overall, input.peerScores, input.product.id);
  const predictedPosition = estimatePosition(
    predicted.overall,
    input.peerScores.filter((s) => s !== current.overall).concat(predicted.overall),
    input.product.id,
  );

  const changes = [
    {
      key: "video",
      label: "Добавить видео",
      applied: Boolean(input.changes.addVideo),
    },
    {
      key: "photo",
      label: "Улучшить первое фото",
      applied: Boolean(input.changes.improveFirstPhoto),
    },
    {
      key: "price",
      label: input.changes.reducePricePercent
        ? `Снизить цену на ${input.changes.reducePricePercent}%`
        : "Снизить цену на 5%",
      applied: Boolean(input.changes.reducePricePercent),
    },
  ];

  return {
    changes,
    currentScore: current.overall,
    predictedScore: predicted.overall,
    currentPosition,
    predictedPosition,
  };
}

export function estimatePosition(
  score: number,
  peerScores: number[],
  _productId: string,
): number | null {
  if (peerScores.length === 0) return 1;
  const sorted = [...peerScores, score].sort((a, b) => b - a);
  const index = sorted.indexOf(score);
  return index >= 0 ? index + 1 : null;
}
