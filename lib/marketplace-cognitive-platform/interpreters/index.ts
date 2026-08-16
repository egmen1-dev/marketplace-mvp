import type { CognitiveContext } from "@/lib/ccos/context/types";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import type { UniversalObservation } from "@/lib/ccos/observation/types";
import {
  compareToMedian,
  scoreInterpretation,
  type ObservationInterpreter,
} from "@/lib/ccos/signals/interpret";
import type { ContextualSignal } from "@/lib/ccos/signals/types";

function baseSignal(
  observation: UniversalObservation,
  context: CognitiveContext,
  partial: Omit<ContextualSignal, "observationId" | "contextId" | "metric">,
): ContextualSignal {
  return {
    observationId: observation.id,
    contextId: context.id,
    metric: observation.metric,
    ...partial,
  };
}

export const behaviourInterpreter: ObservationInterpreter = (observation, context) => {
  if (observation.metric === OBSERVATION_METRICS.behaviour.ctr) {
    if (observation.value == null) {
      return baseSignal(observation, context, {
        domain: "behaviour",
        interpretation: "neutral",
        confidence: Math.min(observation.confidence, 0.35),
        explanation: "Недостаточно данных по CTR для сравнения с категорией",
      });
    }
    const ctr = Number(observation.value);
    const median = context.category?.benchmark?.ctrMedian;
    const interpretation = compareToMedian(ctr, median);
    const medianPct = median != null ? (median * 100).toFixed(1) : "—";
    return baseSignal(observation, context, {
      domain: "behaviour",
      interpretation,
      relativeScore: median != null ? Math.round((ctr / median) * 100) : undefined,
      confidence: Math.min(
        observation.confidence,
        context.category?.benchmark?.confidence ?? 0.5,
      ),
      explanation: `CTR ${(ctr * 100).toFixed(1)}% при медиане категории ${medianPct}%`,
    });
  }

  if (observation.metric === OBSERVATION_METRICS.behaviour.conversion) {
    if (observation.value == null) return null;
    const value = Number(observation.value);
    const median = context.category?.benchmark?.conversionMedian;
    return baseSignal(observation, context, {
      domain: "behaviour",
      interpretation: compareToMedian(value, median),
      confidence: observation.confidence * (context.category?.benchmark?.confidence ?? 0.5),
      explanation: `Конверсия ${(value * 100).toFixed(2)}% относительно категории`,
    });
  }

  return null;
};

export const contentInterpreter: ObservationInterpreter = (observation, context) => {
  const contentMetrics = new Set<string>([
    OBSERVATION_METRICS.content.overallQuality,
    OBSERVATION_METRICS.content.descriptionQuality,
    OBSERVATION_METRICS.visual.photoQuality,
    OBSERVATION_METRICS.visual.thumbnailQuality,
    OBSERVATION_METRICS.seo.contentQuality,
  ]);
  if (!contentMetrics.has(observation.metric)) return null;
  if (observation.normalizedScore == null) return null;
  const median = context.category?.benchmark?.contentQualityMedian;
  return baseSignal(observation, context, {
    domain: observation.domain,
    interpretation: scoreInterpretation(observation.normalizedScore, median),
    relativeScore: median != null ? observation.normalizedScore - median : undefined,
    confidence: observation.confidence * (context.category?.benchmark?.confidence ?? 0.5),
    explanation: `Качество ${observation.normalizedScore}/100 vs медиана категории ${median ?? "—"}`,
  });
};

export const trustInterpreter: ObservationInterpreter = (observation, context) => {
  if (
    observation.metric !== OBSERVATION_METRICS.trust.sellerScore &&
    observation.metric !== OBSERVATION_METRICS.trust.productScore
  ) {
    return null;
  }
  if (observation.normalizedScore == null) return null;

  const lifecycle = context.seller?.lifecycle ?? "unknown";
  if (lifecycle === "new" && (context.seller?.completedOrders ?? 0) < 5) {
    return baseSignal(observation, context, {
      domain: "trust",
      interpretation: "neutral",
      confidence: 0.3,
      explanation: "Недостаточно истории для уверенной оценки надёжности",
    });
  }

  const median = context.category?.benchmark?.trustMedian;
  return baseSignal(observation, context, {
    domain: "trust",
    interpretation: scoreInterpretation(observation.normalizedScore, median),
    confidence: observation.confidence * (context.seller?.lifecycle === "established" ? 0.85 : 0.55),
    explanation: `Trust ${observation.normalizedScore}/100 vs ожидание категории ${median ?? "—"}`,
  });
};

export function buildPriceContextSignal(
  context: CognitiveContext,
  anchorObservation: UniversalObservation,
): ContextualSignal | null {
  const price = context.product?.price;
  if (price == null) return null;
  const median = context.category?.benchmark?.priceMedian;
  if (median == null || median <= 0) return null;
  const deltaPct = Math.round(((price - median) / median) * 100);
  const interpretation =
    deltaPct > 25 ? "negative" : deltaPct > 10 ? "neutral" : deltaPct < -10 ? "positive" : "neutral";
  return {
    observationId: anchorObservation.id,
    contextId: context.id,
    domain: "commercial",
    metric: "commercial.price_context",
    interpretation,
    relativeScore: deltaPct,
    confidence: context.category?.benchmark?.confidence ?? 0.5,
    explanation: `Цена ${price} ₽ (${deltaPct >= 0 ? "+" : ""}${deltaPct}% к медиане категории)`,
  };
}

export function buildQueryRelevanceSignal(context: CognitiveContext): ContextualSignal | null {
  if (!context.query?.normalized || !context.product?.name) return null;
  const productTokens = context.product.name.toLowerCase().split(/\s+/);
  const queryTokens = context.query.tokens;
  if (queryTokens.length === 0) return null;

  const overlap = queryTokens.filter((t) =>
    productTokens.some((p) => p.includes(t) || t.includes(p)),
  ).length;
  const ratio = overlap / queryTokens.length;
  let interpretation: ContextualSignal["interpretation"] = "neutral";
  if (ratio >= 0.85) interpretation = "strong_positive";
  else if (ratio >= 0.6) interpretation = "positive";
  else if (ratio <= 0.2) interpretation = "strong_negative";
  else if (ratio <= 0.35) interpretation = "negative";

  const wrongCategoryToken = queryTokens.some(
    (t) => t.length > 3 && !productTokens.some((p) => p.includes(t) || t.includes(p)),
  );
  if (wrongCategoryToken && ratio < 0.25) {
    interpretation = "strong_negative";
  }

  return {
    observationId: "query-relevance-synthetic",
    contextId: context.id,
    domain: "query",
    metric: "query.relevance",
    interpretation,
    relativeScore: Math.round(ratio * 100),
    confidence: context.query.confidence,
    explanation:
      ratio <= 0.2
        ? `Низкая релевантность карточки запросу «${context.query.raw}»`
        : `Релевантность запросу «${context.query.raw}»: ${Math.round(ratio * 100)}%`,
  };
}

export const marketplaceInterpreters = [
  behaviourInterpreter,
  contentInterpreter,
  trustInterpreter,
];
