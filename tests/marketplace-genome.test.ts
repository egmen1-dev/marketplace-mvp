import { describe, expect, it } from "vitest";

import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { aggregateGenomeFromObservations } from "@/lib/marketplace-cognitive-platform/genome/aggregate";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";

describe("marketplace genome", () => {
  it("aggregates available dimensions with confidence", () => {
    const observations = [
      buildObservation({
        entityType: "product",
        entityId: "p1",
        metric: OBSERVATION_METRICS.content.overallQuality,
        domain: "content",
        value: 80,
        normalizedScore: 80,
        confidence: 0.9,
        evidence: ["content"],
        sourceModule: "cq",
        sourceVersion: "v1",
      }),
      buildObservation({
        entityType: "product",
        entityId: "p1",
        metric: OBSERVATION_METRICS.trust.sellerScore,
        domain: "trust",
        value: 75,
        normalizedScore: 75,
        confidence: 0.85,
        evidence: ["trust"],
        sourceModule: "trust",
        sourceVersion: "v1",
      }),
    ];

    const genome = aggregateGenomeFromObservations(observations);
    expect(genome.overall).not.toBeNull();
    expect(genome.dimensions.delivery).toBeNull();
    expect(genome.dimensions.promotion).toBeNull();
    expect(genome.confidence).toBeGreaterThan(0);
    expect(genome.confidence).toBeLessThanOrEqual(1);
  });

  it("does not collapse missing behaviour to zero", () => {
    const genome = aggregateGenomeFromObservations([
      buildObservation({
        entityType: "product",
        entityId: "cold",
        metric: OBSERVATION_METRICS.content.overallQuality,
        domain: "content",
        value: 70,
        normalizedScore: 70,
        confidence: 0.8,
        evidence: ["content only"],
        sourceModule: "cq",
        sourceVersion: "v1",
      }),
    ]);

    expect(genome.dimensions.behaviour).toBeNull();
    expect(genome.overall).not.toBe(0);
  });
});
