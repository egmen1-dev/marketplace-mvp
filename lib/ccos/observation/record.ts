import {
  isDuplicateObservation,
  markObservationRecorded,
  observationDeduplicationKey,
} from "./dedupe";
import { normalizeObservation } from "./normalize";
import type { RecordObservationResult, UniversalObservation } from "./types";
import { trackCcosEvent } from "../telemetry";

const recordedObservations: UniversalObservation[] = [];

export function resetRecordedObservations(): void {
  recordedObservations.length = 0;
}

export function listRecordedObservations(): readonly UniversalObservation[] {
  return recordedObservations;
}

/**
 * Records an observation after validation + dedupe.
 * Wave 0: in-memory only — no business side effects.
 */
export function recordObservation(observation: UniversalObservation): RecordObservationResult {
  const normalized = normalizeObservation(observation);
  if (!normalized.ok) {
    return { ok: false, errors: normalized.errors };
  }

  const key = observationDeduplicationKey(normalized.observation);
  if (isDuplicateObservation(key)) {
    return { ok: true, observation: normalized.observation, deduplicated: true };
  }

  markObservationRecorded(key);
  recordedObservations.push(Object.freeze({ ...normalized.observation }));
  trackCcosEvent("ccos_observation_recorded");
  return { ok: true, observation: normalized.observation, deduplicated: false };
}

export function recordObservations(
  observations: UniversalObservation[],
): {
  recorded: UniversalObservation[];
  errors: Array<{ metric: string; errors: string[] }>;
} {
  const recorded: UniversalObservation[] = [];
  const errors: Array<{ metric: string; errors: string[] }> = [];

  for (const obs of observations) {
    const result = recordObservation(obs);
    if (result.ok) {
      if (!result.deduplicated) recorded.push(result.observation);
    } else {
      errors.push({ metric: obs.metric, errors: result.errors });
    }
  }

  return { recorded, errors };
}
