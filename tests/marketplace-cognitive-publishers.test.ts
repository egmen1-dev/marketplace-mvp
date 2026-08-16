import { describe, expect, it, beforeEach } from "vitest";

import { registerPublisher, resetPublisherRegistry, runPublishers } from "@/lib/ccos/observation/registry";
import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import { resetRecordedObservations } from "@/lib/ccos/observation/record";
import { resetObservationDedupeCache } from "@/lib/ccos/observation/dedupe";

describe("marketplace cognitive publishers", () => {
  beforeEach(() => {
    resetPublisherRegistry();
    resetRecordedObservations();
    resetObservationDedupeCache();
  });

  it("runs publishers in parallel with health reporting", async () => {
    registerPublisher({
      name: "mock-content",
      async publish() {
        return [
          buildObservation({
            entityType: "product",
            entityId: "p1",
            metric: OBSERVATION_METRICS.content.overallQuality,
            domain: "content",
            value: 80,
            normalizedScore: 80,
            confidence: 0.9,
            evidence: ["quality 80"],
            sourceModule: "mock-content",
            sourceVersion: "v1",
          }),
        ];
      },
    });

    registerPublisher({
      name: "mock-trust",
      async publish() {
        return [
          buildObservation({
            entityType: "product",
            entityId: "p1",
            metric: OBSERVATION_METRICS.trust.sellerScore,
            domain: "trust",
            value: 82,
            normalizedScore: 82,
            confidence: 0.85,
            evidence: ["trust 82"],
            sourceModule: "mock-trust",
            sourceVersion: "v1",
          }),
        ];
      },
    });

    const { observations, publisherHealth } = await runPublishers({
      app: "marketplace",
      entity: { type: "product", id: "p1" },
    });

    expect(observations.length).toBe(2);
    expect(publisherHealth.every((h) => h.status === "OK")).toBe(true);
  });

  it("isolates publisher failure", async () => {
    registerPublisher({
      name: "ok-publisher",
      async publish() {
        return [
          buildObservation({
            entityType: "product",
            entityId: "p1",
            metric: OBSERVATION_METRICS.behaviour.views,
            domain: "behaviour",
            value: 5,
            confidence: 0.8,
            evidence: ["5 views"],
            sourceModule: "mock-behaviour",
            sourceVersion: "v1",
          }),
        ];
      },
    });

    registerPublisher({
      name: "broken-publisher",
      async publish() {
        throw new Error("trust publisher failed");
      },
    });

    const { observations, publisherHealth } = await runPublishers({
      app: "marketplace",
      entity: { type: "product", id: "p1" },
    });

    expect(observations.length).toBe(1);
    expect(publisherHealth.some((h) => h.status === "DEGRADED")).toBe(true);
  });
});
