import type { RankingHistoryEventType } from "@prisma/client";

import { evaluateRankingEligibility } from "./eligibility";
import { computeRankingScore } from "./ranking-score";
import { getActiveRankingVersion } from "./ranking-version";
import { evaluateQualityGates } from "./quality-gates";
import type {
  RankingProductInput,
  RankingScoreBreakdown,
  RankingWeightRow,
} from "./types";

export type RankingEngineResult = {
  eligibility: ReturnType<typeof evaluateRankingEligibility>;
  score: RankingScoreBreakdown;
  qualityGate: ReturnType<typeof evaluateQualityGates>;
  algorithmVersion: string;
  versionId: string;
  weights: RankingWeightRow[];
};

/** Pure evaluation — never mutates catalog/search ordering. */
export async function evaluateProductRanking(
  input: RankingProductInput,
  weightsOverride?: RankingWeightRow[],
): Promise<RankingEngineResult> {
  const { version, weights } = await getActiveRankingVersion();
  const activeWeights = weightsOverride ?? weights;
  const eligibility = evaluateRankingEligibility(input);
  const score = computeRankingScore(input, activeWeights);
  const qualityGate = evaluateQualityGates(input, score);

  return {
    eligibility,
    score,
    qualityGate,
    algorithmVersion: version.version,
    versionId: version.id,
    weights: activeWeights,
  };
}

export function rankingEventLabel(eventType: RankingHistoryEventType): string {
  switch (eventType) {
    case "REVIEW_APPROVED":
      return "Одобрен первый отзыв";
    case "CONTENT_UPDATED":
      return "Обновлена карточка";
    case "TRUST_CHANGED":
      return "Изменился trust score";
    case "WEIGHT_VERSION_CHANGED":
      return "Обновлена версия алгоритма";
    case "QUALITY_GATE_FAILED":
      return "Сработал quality gate";
    case "SIMULATION":
      return "Симуляция";
    case "MANUAL":
      return "Ручной пересчёт";
    default:
      return "Пересчёт позиции";
  }
}
