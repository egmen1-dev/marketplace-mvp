import { describe, expect, it, beforeEach } from "vitest";

import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import {
  listRecordedObservations,
  recordObservation,
  resetRecordedObservations,
} from "@/lib/ccos/observation/record";
import { resetObservationDedupeCache } from "@/lib/ccos/observation/dedupe";

describe("ccos observation record", () => {
  beforeEach(() => {
    resetRecordedObservations();
    resetObservationDedupeCache();
  });

  it("records a valid observation", () => {
    const obs = buildObservation({
      entityType: "product",
      entityId: "p1",
      metric: OBSERVATION_METRICS.content.overallQuality,
      domain: "content",
      value: 82,
      normalizedScore: 82,
      confidence: 0.9,
      evidence: ["Overall quality 82/100"],
      sourceModule: "test",
      sourceVersion: "v1",
    });

    const result = recordObservation(obs);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.deduplicated).toBe(false);
      expect(listRecordedObservations()).toHaveLength(1);
    }
  });

  it("rejects invalid confidence", () => {
    const obs = buildObservation({
      entityType: "product",
      entityId: "p1",
      metric: OBSERVATION_METRICS.behaviour.ctr,
      domain: "behaviour",
      value: 0.02,
      confidence: 1.5,
      evidence: ["bad"],
      sourceModule: "test",
      sourceVersion: "v1",
    });

    const result = recordObservation(obs);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("confidence"))).toBe(true);
    }
  });
});
