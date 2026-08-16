import type {
  AppId,
  EntityType,
  ObservationDomain,
  ObservationPolarity,
  UniversalObservation,
} from "@/lib/ccos/observation/types";
import { createObservationId } from "@/lib/ccos/observation/normalize";

export function buildObservation(input: {
  app?: AppId;
  entityType: EntityType;
  entityId: string;
  metric: string;
  domain: ObservationDomain;
  value: number | string | boolean | null;
  normalizedScore?: number;
  unit?: string;
  confidence: number;
  polarity?: ObservationPolarity;
  evidence: string[];
  sourceModule: string;
  sourceVersion: string;
  contextRef?: string;
  tags?: string[];
}): UniversalObservation {
  const observedAt = new Date().toISOString();
  const polarity =
    input.polarity ??
    (input.normalizedScore == null
      ? "neutral"
      : input.normalizedScore >= 70
        ? "positive"
        : input.normalizedScore < 45
          ? "negative"
          : "neutral");

  return {
    id: createObservationId({
      app: input.app ?? "marketplace",
      entityType: input.entityType,
      entityId: input.entityId,
      metric: input.metric,
      sourceVersion: input.sourceVersion,
      contextRef: input.contextRef,
      window: observedAt.slice(0, 10),
    }),
    metric: input.metric,
    domain: input.domain,
    value: input.value,
    normalizedScore: input.normalizedScore,
    unit: input.unit,
    confidence: input.confidence,
    polarity,
    entity: { type: input.entityType, id: input.entityId },
    app: input.app ?? "marketplace",
    evidence: input.evidence,
    source: { module: input.sourceModule, version: input.sourceVersion },
    observedAt,
    contextRef: input.contextRef,
    tags: input.tags,
    window: observedAt.slice(0, 10),
  };
}
