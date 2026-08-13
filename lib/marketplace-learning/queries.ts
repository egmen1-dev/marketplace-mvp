import type { PriorityRecommendation } from "@/lib/ai-experience/types";
import { loadSellerHealthSnapshot } from "@/lib/seller-growth/seller-health";

import { acceptRecommendationAction } from "./actions";
import {
  createExperimentFromRecommendation,
  listExperiments,
  sellerAggregateBaseline,
  sellerBaselineFromHealthRow,
} from "./experiments";
import { isMarketplaceLearningEnabled } from "./flags";
import { finalizeExperimentOutcome, listOutcomes } from "./outcomes";
import { listPatterns, registerPatternFromExperiment } from "./patterns";
import {
  buildKnowledgeBase,
  computeRecommendationQualityScore,
  sellerWhatWorksStatements,
} from "./recommendations";
import type {
  AdminLearningCenterDashboard,
  SellerLearningInsights,
} from "./types";

async function loadCurrentMetrics(
  sellerProfileId: string,
  entityId: string,
  entityType: "PRODUCT" | "SELLER",
) {
  const health = await loadSellerHealthSnapshot(sellerProfileId).catch(
    () => null,
  );
  if (!health) {
    return sellerAggregateBaseline([]);
  }
  if (entityType === "PRODUCT") {
    const row = health.products.find((p) => p.id === entityId);
    if (row) return sellerBaselineFromHealthRow(row);
  }
  return sellerAggregateBaseline(health.products);
}

export async function ensureLearningExperimentFromRecommendation(input: {
  sellerProfileId: string;
  productId?: string | null;
  recommendation: PriorityRecommendation;
}): Promise<string | null> {
  if (!isMarketplaceLearningEnabled()) return null;

  const existing = listExperiments({
    sellerProfileId: input.sellerProfileId,
    status: "RUNNING",
  }).find(
    (exp) =>
      exp.recommendation === input.recommendation.action &&
      exp.source === (input.recommendation.source as never),
  );
  if (existing) return existing.id;

  const health = await loadSellerHealthSnapshot(input.sellerProfileId).catch(
    () => null,
  );
  const baseline = input.productId
    ? sellerBaselineFromHealthRow(
        health?.products.find((p) => p.id === input.productId) ?? {
          productViews: 0,
          views: 0,
          addToCart: 0,
          orderCount: 0,
        },
      )
    : sellerAggregateBaseline(health?.products ?? []);

  const experiment = createExperimentFromRecommendation({
    sellerProfileId: input.sellerProfileId,
    productId: input.productId,
    recommendation: input.recommendation,
    baseline,
  });

  return experiment.id;
}

export async function trackLearningRecommendationAccepted(input: {
  experimentId: string;
  recommendation: string;
}): Promise<void> {
  if (!isMarketplaceLearningEnabled()) return;
  acceptRecommendationAction(input);
}

export async function evaluateRunningExperiments(
  sellerProfileId: string,
): Promise<void> {
  if (!isMarketplaceLearningEnabled()) return;

  const running = listExperiments({
    sellerProfileId,
    status: "RUNNING",
  });

  for (const experiment of running) {
    if (!experiment.actionCompletedAt) continue;
    const startedMs = new Date(experiment.startedAt).getTime();
    if (Date.now() - startedMs < 60_000) continue;

    const current = await loadCurrentMetrics(
      sellerProfileId,
      experiment.entityId,
      experiment.entityType === "CAMPAIGN" ? "SELLER" : experiment.entityType,
    );

    const outcome = finalizeExperimentOutcome({
      experimentId: experiment.id,
      baseline: experiment.baseline,
      current,
      actionCompleted: Boolean(experiment.actionCompletedAt),
    });

    registerPatternFromExperiment({ experiment, outcome });
  }
}

export async function getSellerLearningInsights(
  sellerProfileId: string,
): Promise<SellerLearningInsights> {
  if (!isMarketplaceLearningEnabled()) {
    return {
      enabled: false,
      whatWorks: [],
      activeExperiments: 0,
      completedExperiments: 0,
      qualityScore: null,
    };
  }

  await evaluateRunningExperiments(sellerProfileId);

  const experiments = listExperiments({ sellerProfileId });
  const active = experiments.filter(
    (e) => e.status === "RUNNING" || e.status === "CREATED",
  ).length;
  const completed = experiments.filter(
    (e) =>
      e.status === "SUCCESS" ||
      e.status === "FAILED" ||
      e.status === "INCONCLUSIVE",
  ).length;

  return {
    enabled: true,
    whatWorks: sellerWhatWorksStatements(),
    activeExperiments: active,
    completedExperiments: completed,
    qualityScore: computeRecommendationQualityScore(),
  };
}

export async function getAdminLearningCenterDashboard(): Promise<AdminLearningCenterDashboard> {
  if (!isMarketplaceLearningEnabled()) {
    return {
      enabled: false,
      marketplaceExperiments: [],
      successfulPatterns: [],
      failedRecommendations: [],
      aiAccuracy: {
        score: 0,
        label: "Disabled",
        accepted: 0,
        improved: 0,
        total: 0,
        summary: "MARKETPLACE_LEARNING_ENABLED=false",
      },
      knowledgeBase: [],
    };
  }

  const experiments = listExperiments();
  const outcomes = listOutcomes();
  const patterns = listPatterns(8);
  const quality = computeRecommendationQualityScore();

  const photoExperiments = experiments.filter((e) =>
    e.recommendation.toLowerCase().includes("фото"),
  );
  const improved = photoExperiments.filter((e) =>
    outcomes.some(
      (o) => o.experimentId === e.id && o.verdict === "POSITIVE",
    ),
  ).length;
  const accepted = photoExperiments.filter((e) => e.recommendationAccepted)
    .length;

  const failed = outcomes
    .filter((o) => o.verdict === "NEGATIVE")
    .slice(0, 6)
    .map((o) => {
      const exp = experiments.find((e) => e.id === o.experimentId);
      return {
        id: o.experimentId,
        title: exp?.recommendation ?? "Рекомендация",
        body: o.summary,
      };
    });

  return {
    enabled: true,
    marketplaceExperiments: [
      {
        id: "exp-summary",
        title: "Активные эксперименты",
        body: `${experiments.filter((e) => e.status === "RUNNING").length} running · ${experiments.length} total`,
        badge: "LIVE",
      },
      {
        id: "exp-photo",
        title: "AI рекомендовал улучшить фото",
        body: `${photoExperiments.length} товарам · ${accepted} приняли · ${improved} получили рост продаж`,
      },
    ],
    successfulPatterns: patterns.filter((p) => p.confidence >= 60),
    failedRecommendations: failed,
    aiAccuracy: {
      score: quality.score,
      label: quality.label,
      accepted,
      improved,
      total: photoExperiments.length,
      summary:
        photoExperiments.length > 0
          ? `AI рекомендовал улучшить фото ${photoExperiments.length} товарам. Результат: ${accepted} улучшили, ${improved} получили рост продаж.`
          : "Недостаточно экспериментов — включите AI Center и выполняйте рекомендации.",
    },
    knowledgeBase: buildKnowledgeBase().slice(0, 12),
  };
}

export function getLearningCardsForAiCenter(
  insights: SellerLearningInsights,
): Array<{ id: string; title: string; body: string; testId: string }> {
  return insights.whatWorks.map((item) => ({
    id: item.id,
    title: "Что работает",
    body: item.statement,
    testId: `learning-works-${item.id}`,
  }));
}
