import {
  getLatestQualitySnapshot,
  isMarketplaceContentQualityEnabled,
} from "@/lib/marketplace-content-quality";
import {
  CRITIC_VERSION,
  FALLBACK_PROVIDER_VERSION,
  QUALITY_MODEL_VERSION,
} from "@/lib/marketplace-content-quality/version";
import type { ObservationPublisher } from "@/lib/ccos/observation/types";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";

import { buildObservation } from "./_helpers";

const SOURCE_VERSION = `${QUALITY_MODEL_VERSION}:${CRITIC_VERSION}`;

export const contentQualityPublisher: ObservationPublisher = {
  name: "marketplace-content-quality",
  async publish(context) {
    if (!isMarketplaceContentQualityEnabled()) return [];
    if (context.entity.type !== "product") return [];

    const snapshot = await getLatestQualitySnapshot(context.entity.id);
    if (!snapshot) return [];

    const ev = snapshot.evaluation;
    const base = {
      entityType: "product" as const,
      entityId: context.entity.id,
      sourceModule: "marketplace-content-quality",
      sourceVersion: snapshot.providerVersion ?? FALLBACK_PROVIDER_VERSION,
      contextRef: context.context?.id,
    };

    const observations = [
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.content.overallQuality,
        domain: "content",
        value: ev.overallScore,
        normalizedScore: ev.overallScore,
        unit: "score",
        confidence: ev.confidence,
        evidence: ev.strengths.slice(0, 2).length
          ? ev.strengths.slice(0, 2)
          : [`Общая оценка ${ev.overallScore}/100`],
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.visual.photoQuality,
        domain: "visual",
        value: ev.photo.score,
        normalizedScore: ev.photo.score,
        unit: "score",
        confidence: ev.photo.confidence,
        evidence: ev.photo.evidence.reasons.slice(0, 3),
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.visual.photoRelevance,
        domain: "visual",
        value: ev.photo.images[0]?.relevance ?? null,
        normalizedScore: ev.photo.images[0]?.relevance,
        unit: "score",
        confidence: ev.photo.confidence,
        evidence: ["Релевантность главного фото"],
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.visual.thumbnailQuality,
        domain: "visual",
        value: ev.thumbnail.score,
        normalizedScore: ev.thumbnail.score,
        unit: "score",
        confidence: ev.thumbnail.confidence,
        evidence: ev.thumbnail.evidence.reasons.slice(0, 2),
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.content.descriptionQuality,
        domain: "content",
        value: ev.description.score,
        normalizedScore: ev.description.score,
        unit: "score",
        confidence: ev.description.confidence,
        evidence: ev.description.evidence.reasons.slice(0, 2),
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.seo.contentQuality,
        domain: "seo",
        value: ev.seo.score,
        normalizedScore: ev.seo.score,
        unit: "score",
        confidence: ev.seo.confidence,
        evidence: ev.seo.evidence.reasons.slice(0, 2),
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.content.attributesQuality,
        domain: "content",
        value: ev.attributes.score,
        normalizedScore: ev.attributes.score,
        unit: "score",
        confidence: ev.attributes.confidence,
        evidence: ev.attributes.evidence.reasons.slice(0, 2),
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.content.consistency,
        domain: "content",
        value: ev.consistency.score,
        normalizedScore: ev.consistency.score,
        unit: "score",
        confidence: ev.consistency.confidence,
        evidence: ev.consistency.evidence.reasons.slice(0, 2),
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.content.buyerValue,
        domain: "content",
        value: ev.buyerValue.score,
        normalizedScore: ev.buyerValue.score,
        unit: "score",
        confidence: ev.buyerValue.confidence,
        evidence: ev.buyerValue.evidence.reasons.slice(0, 2),
      }),
      buildObservation({
        ...base,
        metric: OBSERVATION_METRICS.content.manipulationRisk,
        domain: "content",
        value: ev.manipulation.score,
        normalizedScore: ev.manipulation.score,
        unit: "score",
        confidence: ev.manipulation.confidence,
        polarity: ev.manipulation.score < 50 ? "negative" : "neutral",
        evidence: ev.manipulation.evidence.reasons.slice(0, 2),
      }),
    ];

    if (ev.qualityGateFailed || ev.topEligibility === "BLOCKED") {
      observations.push(
        buildObservation({
          ...base,
          metric: OBSERVATION_METRICS.content.gateBlocked,
          domain: "moderation",
          value: true,
          confidence: 0.95,
          polarity: "negative",
          evidence: ev.blockers.length ? ev.blockers : ev.failedGates,
        }),
      );
      if (ev.failedGates.length > 0) {
        observations.push(
          buildObservation({
            ...base,
            metric: OBSERVATION_METRICS.content.qualityGate,
            domain: "moderation",
            value: ev.failedGates[0] ?? "UNKNOWN",
            confidence: 0.9,
            polarity: "negative",
            evidence: ev.failedGates,
          }),
        );
      }
    }

    return observations;
  },
};

export { SOURCE_VERSION as CONTENT_QUALITY_PUBLISHER_VERSION };
