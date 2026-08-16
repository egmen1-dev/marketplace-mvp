import { describe, expect, it, beforeEach } from "vitest";

import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import { observationDeduplicationKey } from "@/lib/ccos/observation/dedupe";
import {
  recordObservation,
  resetRecordedObservations,
} from "@/lib/ccos/observation/record";
import { resetObservationDedupeCache } from "@/lib/ccos/observation/dedupe";

describe("ccos observation dedupe", () => {
  beforeEach(() => {
    resetRecordedObservations();
    resetObservationDedupeCache();
  });

  it("deduplicates identical observations within window", () => {
    const base = {
      entityType: "product" as const,
      entityId: "p1",
      metric: OBSERVATION_METRICS.behaviour.views,
      domain: "behaviour" as const,
      value: 10,
      confidence: 0.9,
      evidence: ["10 views"],
      sourceModule: "behaviour",
      sourceVersion: "v1",
    };

    const first = recordObservation(buildObservation(base));
    const second = recordObservation(buildObservation(base));

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.deduplicated).toBe(false);
      expect(second.deduplicated).toBe(true);
    }
  });

  it("uses separate keys for different observation windows", () => {
    const obs = buildObservation({
      entityType: "product",
      entityId: "p1",
      metric: OBSERVATION_METRICS.behaviour.ctr,
      domain: "behaviour",
      value: 0.018,
      confidence: 0.5,
      evidence: ["ctr"],
      sourceModule: "behaviour",
      sourceVersion: "v1",
    });

    const keyToday = observationDeduplicationKey(obs);
    const keyTomorrow = observationDeduplicationKey({
      ...obs,
      window: "2099-01-02",
      observedAt: "2099-01-02T12:00:00.000Z",
    });
    expect(keyToday).not.toBe(keyTomorrow);
  });
});
