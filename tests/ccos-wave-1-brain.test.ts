import { describe, expect, it, beforeEach, vi } from "vitest";

import { buildQueryContext, classifyQueryIntent } from "@/lib/ccos/context/query-context";
import { resolveMarketSeason } from "@/lib/ccos/context/market-context";
import { buildDeviceContext } from "@/lib/ccos/context/device-context";
import {
  resolveSellerLifecycle,
  sellerLifecycleConfidence,
} from "@/lib/ccos/context/seller-context";
import { computeContextConfidence, contextConfidenceLabel } from "@/lib/ccos/context/confidence";
import { contextFingerprint } from "@/lib/ccos/context/fingerprint";
import { GLOBAL_FALLBACK } from "@/lib/ccos/context/category-context";
import { compareToMedian, scoreInterpretation } from "@/lib/ccos/signals/interpret";
import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import {
  behaviourInterpreter,
  buildQueryRelevanceSignal,
  trustInterpreter,
} from "@/lib/marketplace-cognitive-platform/interpreters";
import { buildMarketplaceContextualSignals } from "@/lib/marketplace-cognitive-platform/signals/build-signals";
import { buildMarketplaceGenomeV1 } from "@/lib/marketplace-cognitive-platform/genome/contextual";
import { aggregateGenomeFromObservations } from "@/lib/marketplace-cognitive-platform/genome/aggregate";
import { buildTestBrainContext } from "@/lib/marketplace-cognitive-platform/brain/v1/report";
import {
  collectActionCandidates,
  selectNextBestAction,
} from "@/lib/marketplace-cognitive-platform/brain/v1/next-action";
import { orchestrateDecision } from "@/lib/marketplace-cognitive-platform/brain/v1/decision";
import { registerPublisher, resetPublisherRegistry } from "@/lib/ccos/observation/registry";
import { resetRecordedObservations } from "@/lib/ccos/observation/record";
import { resetObservationDedupeCache } from "@/lib/ccos/observation/dedupe";
import { getMarketplaceBrainReport } from "@/lib/marketplace-cognitive-platform/brain/v1/report";
import { resetMarketplacePublishers } from "@/lib/marketplace-cognitive-platform/publishers/registry";
import { assertBrainCapability } from "@/lib/ccos/governance/maturity";
import { resolveMarketplaceBrainMaturity } from "@/lib/marketplace-cognitive-platform/flags";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === "fan-product") {
          return {
            id: "fan-product",
            name: "Вентилятор напольный тихий",
            price: 4500,
            categoryId: "cat-fans",
            category: { id: "cat-fans", name: "Вентиляторы", slug: "fans" },
            seller: { reputation: { completedOrders: 500, trustScore: 72 } },
          };
        }
        return null;
      }),
      findMany: vi.fn(async () => []),
    },
  },
}));

function fanContext(query?: string) {
  return buildTestBrainContext("fan-product", {
    query: query ? buildQueryContext(query) : undefined,
    product: { id: "fan-product", name: "Вентилятор напольный тихий", price: 4500 },
    category: {
      id: "cat-fans",
      name: "Вентиляторы",
      benchmarkRef: "test",
      benchmark: {
        ...GLOBAL_FALLBACK,
        ctrMedian: 0.03,
        contentQualityMedian: 68,
        priceMedian: 3200,
        trustMedian: 72,
        sampleSize: 50,
        confidence: 0.8,
        source: "test-benchmark",
      },
    },
    seller: { lifecycle: "established", completedOrders: 500 },
    device: { type: "desktop" },
    market: { season: "summer" },
  });
}

describe("ccos wave 1 context engine", () => {
  it("classifies query intents rule-based", () => {
    expect(classifyQueryIntent("вентилятор").intent.category).toBeTruthy();
    expect(classifyQueryIntent("тихий вентилятор").intent.features).toContain("quiet");
    expect(classifyQueryIntent("вентилятор для офиса").intent.useCases).toContain("office");
    expect(classifyQueryIntent("вентилятор до 3000").intent.price?.max).toBe(3000);
    expect(classifyQueryIntent("вентилятор в подарок").intent.gift).toBe(true);
  });

  it("builds season and device context", () => {
    expect(resolveMarketSeason(new Date("2026-07-15"))).toBe("summer");
    expect(resolveMarketSeason(new Date("2026-01-15"))).toBe("winter");
    expect(buildDeviceContext("mobile").type).toBe("mobile");
    expect(buildDeviceContext(undefined).type).toBe("unknown");
  });

  it("resolves seller lifecycle stages", () => {
    expect(resolveSellerLifecycle(0)).toBe("new");
    expect(resolveSellerLifecycle(12)).toBe("growing");
    expect(resolveSellerLifecycle(500)).toBe("established");
    expect(sellerLifecycleConfidence(0)).toBeLessThan(sellerLifecycleConfidence(500));
  });

  it("computes context confidence separately from score", () => {
    const conf = computeContextConfidence({ query: 0.92, buyer: 0.31, category: 0.8 });
    expect(conf.query).toBe(0.92);
    expect(conf.buyer).toBe(0.31);
    expect(contextConfidenceLabel(conf)).toBe("MEDIUM");
  });

  it("produces deterministic context fingerprint", () => {
    const ctx = fanContext("тихий вентилятор");
    const fp1 = contextFingerprint(ctx);
    const fp2 = contextFingerprint({ ...ctx, query: buildQueryContext("тихий вентилятор")! });
    expect(fp1).toBe(fp2);
    const other = fanContext("чайник");
    expect(contextFingerprint(other)).not.toBe(fp1);
  });
});

describe("ccos wave 1 interpretation", () => {
  it("interprets CTR relative to category median", () => {
    const ctx = fanContext();
    const obs = buildObservation({
      entityType: "product",
      entityId: "fan-product",
      metric: OBSERVATION_METRICS.behaviour.ctr,
      domain: "behaviour",
      value: 0.018,
      confidence: 0.8,
      evidence: ["ctr"],
      sourceModule: "test",
      sourceVersion: "v1",
    });
    const signal = behaviourInterpreter(obs, ctx);
    expect(signal?.interpretation).toMatch(/negative/);
    expect(signal?.explanation).toContain("1.8%");
  });

  it("same CTR differs by category benchmark", () => {
    const lowMedianCtx = buildTestBrainContext("fan-product", {
      category: {
        id: "cat-a",
        benchmark: { ...GLOBAL_FALLBACK, ctrMedian: 0.015, sampleSize: 40, confidence: 0.8, source: "a" },
      },
    });
    const highMedianCtx = buildTestBrainContext("fan-product", {
      category: {
        id: "cat-b",
        benchmark: { ...GLOBAL_FALLBACK, ctrMedian: 0.045, sampleSize: 40, confidence: 0.8, source: "b" },
      },
    });
    const obs = buildObservation({
      entityType: "product",
      entityId: "fan-product",
      metric: OBSERVATION_METRICS.behaviour.ctr,
      domain: "behaviour",
      value: 0.021,
      confidence: 0.8,
      evidence: ["ctr"],
      sourceModule: "test",
      sourceVersion: "v1",
    });
    const a = behaviourInterpreter(obs, lowMedianCtx);
    const b = behaviourInterpreter(obs, highMedianCtx);
    expect(compareToMedian(0.021, 0.015)).toBe("strong_positive");
    expect(compareToMedian(0.021, 0.045)).toBe("strong_negative");
    expect(a?.interpretation).not.toBe(b?.interpretation);
  });

  it("trust cold start stays neutral with low confidence", () => {
    const ctx = buildTestBrainContext("new-seller", {
      seller: { lifecycle: "new", completedOrders: 0 },
    });
    const obs = buildObservation({
      entityType: "product",
      entityId: "p",
      metric: OBSERVATION_METRICS.trust.sellerScore,
      domain: "trust",
      value: 70,
      normalizedScore: 70,
      confidence: 0.7,
      evidence: ["trust"],
      sourceModule: "test",
      sourceVersion: "v1",
    });
    const signal = trustInterpreter(obs, ctx);
    expect(signal?.interpretation).toBe("neutral");
    expect(signal?.confidence).toBeLessThan(0.4);
  });

  it("separates content quality from query relevance", () => {
    const ctx = fanContext("электрический чайник");
    const relevance = buildQueryRelevanceSignal(ctx);
    expect(relevance?.interpretation).toMatch(/negative/);
    expect(scoreInterpretation(95, 68)).toBe("strong_positive");
  });
});

describe("ccos wave 1 marketplace brain", () => {
  beforeEach(() => {
    resetMarketplacePublishers();
    resetPublisherRegistry();
    resetRecordedObservations();
    resetObservationDedupeCache();
    registerPublisher({
      name: "wave1-fixture",
      async publish(ctx) {
        return [
          buildObservation({
            entityType: "product",
            entityId: ctx.entity.id,
            metric: OBSERVATION_METRICS.content.overallQuality,
            domain: "content",
            value: 88,
            normalizedScore: 88,
            confidence: 0.9,
            evidence: ["strong content"],
            sourceModule: "fixture",
            sourceVersion: "v1",
          }),
          buildObservation({
            entityType: "product",
            entityId: ctx.entity.id,
            metric: OBSERVATION_METRICS.visual.photoQuality,
            domain: "visual",
            value: 40,
            normalizedScore: 40,
            confidence: 0.85,
            evidence: ["weak hero"],
            sourceModule: "fixture",
            sourceVersion: "v1",
          }),
          buildObservation({
            entityType: "product",
            entityId: ctx.entity.id,
            metric: OBSERVATION_METRICS.behaviour.ctr,
            domain: "behaviour",
            value: 0.018,
            normalizedScore: 50,
            confidence: 0.7,
            evidence: ["ctr"],
            sourceModule: "fixture",
            sourceVersion: "v1",
          }),
          buildObservation({
            entityType: "product",
            entityId: ctx.entity.id,
            metric: OBSERVATION_METRICS.content.gateBlocked,
            domain: "content",
            value: false,
            confidence: 1,
            evidence: ["gate ok"],
            sourceModule: "fixture",
            sourceVersion: "v1",
          }),
        ];
      },
    });
  });

  it("keeps base genome stable across queries while contextual layer changes", async () => {
    const queries = [
      "вентилятор",
      "тихий вентилятор",
      "вентилятор для офиса",
      "вентилятор до 3000",
      "вентилятор в подарок",
    ];
    const reports = [];
    for (const q of queries) {
      resetObservationDedupeCache();
      reports.push(await getMarketplaceBrainReport("fan-product", { query: q }));
    }
    const baseScores = reports.map((r) => r!.genome.base.overall);
    expect(new Set(baseScores).size).toBe(1);
    const contextual = reports.map((r) => r!.genome.contextual.overall);
    expect(new Set(contextual).size).toBeGreaterThanOrEqual(1);
    const fingerprints = reports.map((r) => r!.context.fingerprint);
    expect(new Set(fingerprints).size).toBeGreaterThan(1);
    const querySignals = reports.map(
      (r) => r!.signals.find((s) => s.metric === "query.relevance")?.interpretation,
    );
    expect(new Set(querySignals).size).toBeGreaterThan(1);
  });

  it("selects one primary next action and suppresses promotion on quality gate", () => {
    const ctx = fanContext();
    const observations = [
      buildObservation({
        entityType: "product",
        entityId: "p",
        metric: OBSERVATION_METRICS.content.gateBlocked,
        domain: "content",
        value: true,
        confidence: 1,
        evidence: ["gate"],
        sourceModule: "cq",
        sourceVersion: "v1",
      }),
    ];
    const signals = buildMarketplaceContextualSignals(observations, ctx);
    const candidates = collectActionCandidates({
      observations,
      signals,
      productId: "p",
      qualityGateFailed: true,
      hasBehaviourData: false,
    });
    const decision = orchestrateDecision({
      observations,
      blockers: [],
      qualityGateFailed: true,
    });
    const { primary, candidates: ranked } = selectNextBestAction(candidates, decision);
    expect(primary?.title).toMatch(/качеств/i);
    expect(ranked.find((c) => c.id === "promotion-generic")?.suppressed).toBe(true);
  });

  it("prefers photo fix over promotion when quality weak", () => {
    const ctx = fanContext();
    const observations = [
      buildObservation({
        entityType: "product",
        entityId: "p",
        metric: OBSERVATION_METRICS.visual.photoQuality,
        domain: "visual",
        value: 35,
        normalizedScore: 35,
        confidence: 0.9,
        evidence: ["bad photo"],
        sourceModule: "cq",
        sourceVersion: "v1",
      }),
    ];
    const signals = buildMarketplaceContextualSignals(observations, ctx);
    const candidates = collectActionCandidates({
      observations,
      signals,
      productId: "p",
      qualityGateFailed: false,
      hasBehaviourData: true,
    });
    const decision = orchestrateDecision({
      observations,
      blockers: [],
      qualityGateFailed: false,
    });
    const { primary } = selectNextBestAction(candidates, decision);
    expect(primary?.title).toMatch(/фото/i);
  });

  it("adjusts contextual visual on mobile", () => {
    const ctxDesktop = fanContext();
    const ctxMobile = buildTestBrainContext("fan-product", {
      ...ctxDesktop,
      device: { type: "mobile" },
    });
    const observations = [
      buildObservation({
        entityType: "product",
        entityId: "p",
        metric: OBSERVATION_METRICS.visual.photoQuality,
        domain: "visual",
        value: 82,
        normalizedScore: 82,
        confidence: 0.9,
        evidence: ["photo"],
        sourceModule: "cq",
        sourceVersion: "v1",
      }),
    ];
    const base = aggregateGenomeFromObservations(observations);
    const desktop = buildMarketplaceGenomeV1(
      base,
      ctxDesktop,
      buildMarketplaceContextualSignals(observations, ctxDesktop),
    );
    const mobile = buildMarketplaceGenomeV1(
      base,
      ctxMobile,
      buildMarketplaceContextualSignals(observations, ctxMobile),
    );
    expect(mobile.contextual.dimensions.visual).toBeLessThan(
      desktop.contextual.dimensions.visual!,
    );
    expect(base.dimensions.visual).toBe(82);
    expect(desktop.contextual.dimensions.visual).toBeGreaterThan(82);
  });

  it("L2 advisor cannot simulate; L3 capability exists in flags helper", () => {
    expect(assertBrainCapability(resolveMarketplaceBrainMaturity(), "simulate")).toBe(false);
    expect(assertBrainCapability("L3_SIMULATOR", "simulate")).toBe(true);
    expect(assertBrainCapability("L3_SIMULATOR", "execute")).toBe(false);
  });
});
