import {
  buildRankingExplanation,
  estimatePosition,
  evaluateProductRanking,
  isMarketplaceRankingIntelligenceEnabled,
} from "@/lib/marketplace-ranking-intelligence";
import { loadProductInput } from "@/lib/marketplace-ranking-intelligence/queries";
import type { ObservationPublisher } from "@/lib/ccos/observation/types";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";

import { buildObservation } from "./_helpers";

const RANKING_PUBLISHER_VERSION = "ranking-advisory-v1";

export const rankingPublisher: ObservationPublisher = {
  name: "marketplace-ranking-intelligence",
  async publish(context) {
    if (!isMarketplaceRankingIntelligenceEnabled()) return [];
    if (context.entity.type !== "product") return [];

    const input = await loadProductInput(context.entity.id);
    if (!input) return [];

    const evaluation = await evaluateProductRanking(input);
    const explanation = buildRankingExplanation(
      input,
      evaluation.score,
      evaluation.eligibility.status === "ELIGIBLE"
        ? estimatePosition(evaluation.score.overall, [], input.id)
        : null,
    );

    const estimatedPosition =
      evaluation.eligibility.status === "ELIGIBLE"
        ? estimatePosition(evaluation.score.overall, [], input.id)
        : null;
    const topGap = explanation.blockers[0]?.estimatedLoss ?? null;

    const base = {
      entityType: "product" as const,
      entityId: context.entity.id,
      sourceModule: "marketplace-ranking-intelligence",
      sourceVersion: RANKING_PUBLISHER_VERSION,
      contextRef: context.context?.id,
      tags: ["advisory-only"],
    };

    return [
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.ranking.estimatedPosition,
        domain: "commercial",
        value: estimatedPosition,
        normalizedScore:
          estimatedPosition != null
            ? Math.max(0, 100 - Math.min(99, estimatedPosition))
            : undefined,
        unit: "rank",
        confidence: 0.35,
        evidence: [
          estimatedPosition != null
            ? `Advisory позиция ~${estimatedPosition} (без peer-контекста)`
            : "Позиция недоступна — товар не eligible",
        ],
        tags: ["advisory-only"],
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.ranking.score,
        domain: "commercial",
        value: evaluation.score.overall,
        normalizedScore: evaluation.score.overall,
        unit: "score",
        confidence: 0.85,
        evidence: [`Advisory ranking score ${evaluation.score.overall}/100`],
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.ranking.blockerCount,
        domain: "commercial",
        value: explanation.blockers.length,
        normalizedScore: Math.max(0, 100 - explanation.blockers.length * 10),
        unit: "count",
        confidence: 0.8,
        polarity: explanation.blockers.length > 0 ? "negative" : "positive",
        evidence: explanation.blockers.map((b) => b.title).slice(0, 3),
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.ranking.topGap,
        domain: "commercial",
        value: topGap,
        normalizedScore: topGap != null ? Math.max(0, 100 - topGap * 5) : undefined,
        unit: "score",
        confidence: topGap != null ? 0.7 : 0.2,
        polarity: topGap != null && topGap > 5 ? "negative" : "neutral",
        evidence:
          topGap != null
            ? [`Gap до топа: ~${topGap} баллов`]
            : ["Недостаточно данных для top gap"],
      }),
    ];
  },
};
