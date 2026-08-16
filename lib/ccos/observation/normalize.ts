import { createHash } from "node:crypto";

import type { UniversalObservation } from "./types";

export function createObservationId(input: {
  app: string;
  entityType: string;
  entityId: string;
  metric: string;
  sourceVersion: string;
  contextRef?: string;
  window?: string;
}): string {
  const key = [
    input.app,
    input.entityType,
    input.entityId,
    input.metric,
    input.sourceVersion,
    input.contextRef ?? "",
    input.window ?? "",
  ].join("|");
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 16);
  return `${input.app}:${input.entityType}:${input.entityId}:${input.metric}:${hash}`;
}

export function observationDeduplicationKey(observation: UniversalObservation): string {
  const fingerprint =
    observation.value === null
      ? "null"
      : typeof observation.value === "object"
        ? JSON.stringify(observation.value)
        : String(observation.value);
  return [
    observation.app,
    observation.entity.type,
    observation.entity.id,
    observation.metric,
    observation.source.module,
    observation.source.version,
    observation.contextRef ?? "",
    observation.window ?? observation.observedAt.slice(0, 10),
    fingerprint,
  ].join("|");
}

export function normalizeObservation(
  observation: UniversalObservation,
): { ok: true; observation: UniversalObservation } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!observation.metric.trim()) errors.push("metric is required");
  if (!observation.entity.id.trim()) errors.push("entity.id is required");
  if (!observation.source.module.trim()) errors.push("source.module is required");
  if (!observation.source.version.trim()) errors.push("source.version is required");

  if (observation.confidence < 0 || observation.confidence > 1) {
    errors.push("confidence must be in [0,1]");
  }

  if (
    observation.normalizedScore != null &&
    (observation.normalizedScore < 0 || observation.normalizedScore > 100)
  ) {
    errors.push("normalizedScore must be in [0,100]");
  }

  const observedAtMs = Date.parse(observation.observedAt);
  if (Number.isNaN(observedAtMs)) {
    errors.push("observedAt must be valid ISO date");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    observation: {
      ...observation,
      metric: observation.metric.trim(),
      confidence: Math.min(1, Math.max(0, observation.confidence)),
      normalizedScore:
        observation.normalizedScore == null
          ? undefined
          : Math.min(100, Math.max(0, observation.normalizedScore)),
      evidence: observation.evidence.map((e) => e.trim()).filter(Boolean),
    },
  };
}
