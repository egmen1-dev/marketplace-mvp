import { getLearningStore } from "./store";
import { listExperiments } from "./experiments";
import { listOutcomes } from "./outcomes";
import { listPatterns, seedDefaultPatterns } from "./patterns";
import { clampScore, qualityLabel } from "./learning-signals";
import type {
  KnowledgeBaseEntry,
  RecommendationQualityScore,
} from "./types";

export function buildKnowledgeBase(): KnowledgeBaseEntry[] {
  seedDefaultPatterns();
  const store = getLearningStore();
  const entries: KnowledgeBaseEntry[] = [];

  for (const pattern of store.patterns.values()) {
    entries.push({
      id: `kb-pattern-${pattern.id}`,
      kind: "PATTERN",
      title: pattern.statement,
      body: `Confidence ${pattern.confidence}% · sample ${pattern.sampleSize}`,
      confidence: pattern.confidence,
      sampleSize: pattern.sampleSize,
      createdAt: pattern.createdAt,
    });
  }

  for (const outcome of store.outcomes.values()) {
    entries.push({
      id: `kb-outcome-${outcome.experimentId}`,
      kind:
        outcome.verdict === "POSITIVE"
          ? "SUCCESS"
          : outcome.verdict === "NEGATIVE"
            ? "FAILURE"
            : "CATEGORY_INSIGHT",
      title: outcome.verdict,
      body: outcome.summary,
      createdAt: outcome.evaluatedAt,
    });
  }

  return entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function computeRecommendationQualityScore(): RecommendationQualityScore {
  const experiments = listExperiments();
  const outcomes = listOutcomes();
  const total = experiments.length;
  const accepted = experiments.filter((e) => e.recommendationAccepted).length;
  const completed = experiments.filter((e) => e.actionCompletedAt).length;
  const positive = outcomes.filter((o) => o.verdict === "POSITIVE").length;
  const repeatedSuccess =
    outcomes.filter((o) => o.verdict === "POSITIVE").length > 1
      ? Math.min(positive, 5)
      : positive;

  const acceptanceRate = total > 0 ? accepted / total : 0;
  const completionRate = accepted > 0 ? completed / accepted : 0;
  const successRate = completed > 0 ? positive / completed : 0;
  const repeatRate = completed > 0 ? repeatedSuccess / completed : 0;

  const acceptanceScore = acceptanceRate * 30;
  const completionScore = completionRate * 25;
  const outcomeScore = successRate * 30;
  const repeatScore = repeatRate * 15;

  const score = clampScore(
    acceptanceScore + completionScore + outcomeScore + repeatScore,
  );

  return {
    score,
    label: qualityLabel(score),
    factors: [
      {
        key: "accepted",
        label: "Recommendation accepted",
        value: `${accepted}/${total || 0}`,
        weight: Math.round(acceptanceScore),
      },
      {
        key: "completed",
        label: "Action completed",
        value: `${completed}/${accepted || 0}`,
        weight: Math.round(completionScore),
      },
      {
        key: "positive",
        label: "Positive outcome",
        value: `${positive}/${completed || 0}`,
        weight: Math.round(outcomeScore),
      },
      {
        key: "repeat",
        label: "Repeated success",
        value: String(repeatedSuccess),
        weight: Math.round(repeatScore),
      },
    ],
  };
}

export function sellerWhatWorksStatements(): Array<{
  id: string;
  statement: string;
  confidence: number;
  sampleSize: number;
}> {
  return listPatterns(4).map((pattern) => ({
    id: pattern.id,
    statement: formatSellerInsight(pattern.statement, pattern.confidence),
    confidence: pattern.confidence,
    sampleSize: pattern.sampleSize,
  }));
}

function formatSellerInsight(statement: string, confidence: number): string {
  if (statement.includes("фото")) {
    return `У продавцов вашего типа добавление фото увеличивало продажи в среднем на ${Math.round(confidence / 5)}%`;
  }
  if (statement.includes("характеристик")) {
    return "Товары с заполненными характеристиками получают больше заказов";
  }
  if (statement.includes("trust")) {
    return "Высокий уровень доверия помогает конверсии в заказ";
  }
  return statement;
}
