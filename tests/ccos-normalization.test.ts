import { describe, expect, it } from "vitest";

import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import {
  createObservationId,
  normalizeObservation,
} from "@/lib/ccos/observation/normalize";

describe("ccos normalizeObservation", () => {
  it("validates required fields and clamps scores", () => {
    const obs = buildObservation({
      entityType: "product",
      entityId: "p1",
      metric: OBSERVATION_METRICS.trust.sellerScore,
      domain: "trust",
      value: 120,
      normalizedScore: 120,
      confidence: 2,
      evidence: ["  trust ok  "],
      sourceModule: "marketplace-trust-score",
      sourceVersion: "v1",
    });

    const result = normalizeObservation(obs);
    expect(result.ok).toBe(false);
  });

  it("creates deterministic observation ids", () => {
    const id1 = createObservationId({
      app: "marketplace",
      entityType: "product",
      entityId: "123",
      metric: OBSERVATION_METRICS.visual.photoQuality,
      sourceVersion: "v1",
    });
    const id2 = createObservationId({
      app: "marketplace",
      entityType: "product",
      entityId: "123",
      metric: OBSERVATION_METRICS.visual.photoQuality,
      sourceVersion: "v1",
    });
    expect(id1).toBe(id2);
    expect(id1.startsWith("marketplace:product:123:")).toBe(true);
  });

  it("accepts cross-app daos metric names", () => {
    const obs = buildObservation({
      app: "daos",
      entityType: "image",
      entityId: "img-1",
      metric: OBSERVATION_METRICS.visual.photoContrast,
      domain: "visual",
      value: 88,
      normalizedScore: 88,
      confidence: 0.8,
      evidence: ["Contrast 88/100"],
      sourceModule: "daos-visual",
      sourceVersion: "v1",
    });

    const result = normalizeObservation(obs);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.observation.app).toBe("daos");
    }
  });
});
