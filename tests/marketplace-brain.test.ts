import { describe, expect, it, beforeEach } from "vitest";

import { registerPublisher, resetPublisherRegistry } from "@/lib/ccos/observation/registry";
import { resetRecordedObservations } from "@/lib/ccos/observation/record";
import { resetObservationDedupeCache } from "@/lib/ccos/observation/dedupe";
import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import { getCognitiveProductReport } from "@/lib/marketplace-cognitive-platform/brain/report";
import { resetMarketplacePublishers } from "@/lib/marketplace-cognitive-platform/publishers/registry";
import { buildDecisionBlockers } from "@/lib/marketplace-cognitive-platform/brain/explain";

function registerFixturePublishers(): void {
  registerPublisher({
    name: "fixture-content",
    async publish(ctx) {
      return [
        buildObservation({
          entityType: "product",
          entityId: ctx.entity.id,
          metric: OBSERVATION_METRICS.content.overallQuality,
          domain: "content",
          value: 78,
          normalizedScore: 78,
          confidence: 0.9,
          evidence: ["overall 78"],
          sourceModule: "fixture-content",
          sourceVersion: "v1",
        }),
        buildObservation({
          entityType: "product",
          entityId: ctx.entity.id,
          metric: OBSERVATION_METRICS.visual.photoQuality,
          domain: "visual",
          value: 42,
          normalizedScore: 42,
          confidence: 0.85,
          evidence: ["weak photo"],
          sourceModule: "fixture-content",
          sourceVersion: "v1",
        }),
      ];
    },
  });

  registerPublisher({
    name: "fixture-trust",
    async publish(ctx) {
      return [
        buildObservation({
          entityType: "product",
          entityId: ctx.entity.id,
          metric: OBSERVATION_METRICS.trust.sellerScore,
          domain: "trust",
          value: 84,
          normalizedScore: 84,
          confidence: 0.8,
          evidence: ["trust 84"],
          sourceModule: "fixture-trust",
          sourceVersion: "v1",
        }),
      ];
    },
  });

  registerPublisher({
    name: "fixture-behaviour",
    async publish(ctx) {
      return [
        buildObservation({
          entityType: "product",
          entityId: ctx.entity.id,
          metric: OBSERVATION_METRICS.behaviour.ctr,
          domain: "behaviour",
          value: 0.018,
          normalizedScore: 55,
          confidence: 0.7,
          evidence: ["CTR 1.8%"],
          sourceModule: "fixture-behaviour",
          sourceVersion: "v1",
        }),
        buildObservation({
          entityType: "product",
          entityId: ctx.entity.id,
          metric: OBSERVATION_METRICS.behaviour.conversion,
          domain: "behaviour",
          value: 0.03,
          normalizedScore: 60,
          confidence: 0.65,
          evidence: ["conversion 3%"],
          sourceModule: "fixture-behaviour",
          sourceVersion: "v1",
        }),
      ];
    },
  });

  registerPublisher({
    name: "fixture-ranking",
    async publish(ctx) {
      return [
        buildObservation({
          entityType: "product",
          entityId: ctx.entity.id,
          metric: OBSERVATION_METRICS.ranking.score,
          domain: "commercial",
          value: 71,
          normalizedScore: 71,
          confidence: 0.85,
          evidence: ["advisory ranking 71"],
          sourceModule: "fixture-ranking",
          sourceVersion: "v1",
          tags: ["advisory-only"],
        }),
      ];
    },
  });
}

describe("marketplace brain report", () => {
  beforeEach(() => {
    resetMarketplacePublishers();
    resetPublisherRegistry();
    resetRecordedObservations();
    resetObservationDedupeCache();
    registerFixturePublishers();
  });

  it("merges islands into one cognitive report", async () => {
    const report = await getCognitiveProductReport("fixture-product");
    expect(report).not.toBeNull();
    expect(report!.observations.length).toBeGreaterThanOrEqual(5);
    expect(report!.genome.overall).not.toBeNull();
    expect(report!.advisoryOnly).toBe(true);
    expect(report!.maturityLevel).toBe("L2_ADVISOR");
    expect(report!.publisherHealth.length).toBe(4);
  });

  it("handles missing behaviour history without zero genome collapse", async () => {
    resetPublisherRegistry();
    registerPublisher({
      name: "content-only",
      async publish(ctx) {
        return [
          buildObservation({
            entityType: "product",
            entityId: ctx.entity.id,
            metric: OBSERVATION_METRICS.content.overallQuality,
            domain: "content",
            value: 72,
            normalizedScore: 72,
            confidence: 0.8,
            evidence: ["content"],
            sourceModule: "content-only",
            sourceVersion: "v1",
          }),
          buildObservation({
            entityType: "product",
            entityId: ctx.entity.id,
            metric: OBSERVATION_METRICS.behaviour.ctr,
            domain: "behaviour",
            value: null,
            confidence: 0.15,
            evidence: ["cold start"],
            sourceModule: "content-only",
            sourceVersion: "v1",
          }),
        ];
      },
    });

    const report = await getCognitiveProductReport("cold-product");
    expect(report!.genome.dimensions.behaviour).toBeNull();
    expect(report!.missingData.some((m) => m.includes("CTR"))).toBe(true);
  });

  it("does not create hard blockers from low-confidence photo relevance", () => {
    const blockers = buildDecisionBlockers([
      buildObservation({
        entityType: "product",
        entityId: "p1",
        metric: OBSERVATION_METRICS.visual.photoRelevance,
        domain: "visual",
        value: 30,
        normalizedScore: 30,
        confidence: 0.2,
        evidence: ["low relevance"],
        sourceModule: "cq",
        sourceVersion: "v1",
      }),
    ]);
    expect(blockers).toHaveLength(0);
  });
});
