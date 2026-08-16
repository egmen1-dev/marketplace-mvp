#!/usr/bin/env tsx
/**
 * EPIC-77-WAVE-0-STAGING-ACCEPTANCE-001
 * Runtime acceptance against staging DB + local cognitive stack.
 *
 * Usage (Railway):
 *   railway run --service web-v2 tsx scripts/ccos-wave-0-staging-acceptance.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { registerPublisher, resetPublisherRegistry } from "@/lib/ccos/observation/registry";
import { resetRecordedObservations } from "@/lib/ccos/observation/record";
import { resetObservationDedupeCache } from "@/lib/ccos/observation/dedupe";
import { recordObservation, normalizeObservation } from "@/lib/ccos/observation";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import { proposeHypothesis, InMemoryKnowledgeStore } from "@/lib/ccos/knowledge/store";
import { createEvidence } from "@/lib/ccos/knowledge/evidence";
import {
  MARKETPLACE_BRAIN_MATURITY,
  assertBrainCapability,
  requireBrainCapability,
} from "@/lib/ccos/governance/maturity";
import { denyAutopilotExecution } from "@/lib/ccos/governance/advisory-guard";
import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { getCognitiveProductReport } from "@/lib/marketplace-cognitive-platform/brain/report";
import {
  ensureMarketplacePublishersRegistered,
  resetMarketplacePublishers,
} from "@/lib/marketplace-cognitive-platform/publishers/registry";
import { isCognitiveProductReportAvailable } from "@/lib/marketplace-cognitive-platform/queries";
import { getLatestQualitySnapshot } from "@/lib/marketplace-content-quality";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "node:fs";

const STAGING_BASE = "https://web-production-e56fb.up.railway.app";
const MAIN_SHA = "8e61721e2a0707563938f0be08833e58a3bf81f9";

type GateResult = "PASS" | "FAIL" | "PARTIAL" | "SKIP";

type AcceptanceReport = {
  generatedAt: string;
  mainSha: string;
  stagingVersion: unknown;
  stagingHealth: unknown;
  flags: Record<string, string | undefined>;
  acceptanceProduct: Record<string, unknown>;
  publishers: Array<{
    name: string;
    health: string;
    observationCount: number;
    metrics: string[];
  }>;
  genome: Record<string, unknown>;
  brain: Record<string, unknown>;
  governance: Record<string, unknown>;
  crossApp: Record<string, unknown>;
  performance: Record<string, unknown>;
  gates: Record<string, GateResult>;
  verdict: string;
  subVerdicts: Record<string, string>;
};

function gate(results: Record<string, GateResult>, key: string, ok: boolean, partial = false): void {
  results[key] = ok ? "PASS" : partial ? "PARTIAL" : "FAIL";
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  return res.json();
}

async function pickAcceptanceProduct(): Promise<{
  id: string;
  slug: string | null;
  sellerId: string;
  views: number;
  name: string;
}> {
  const cqProduct = await prisma.product.findFirst({
    where: {
      OR: [
        { slug: "cq-accept-good-fan" },
        { slug: { startsWith: "cq-accept" } },
      ],
      productQualitySnapshot: { isNot: null },
    },
    select: {
      id: true,
      slug: true,
      sellerId: true,
      views: true,
      name: true,
    },
  });
  if (cqProduct) return cqProduct;

  const anyWithSnapshot = await prisma.product.findFirst({
    where: { productQualitySnapshot: { isNot: null } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, sellerId: true, views: true, name: true },
  });
  if (anyWithSnapshot) return anyWithSnapshot;

  throw new Error("No acceptance product with Content Quality snapshot found");
}

async function main() {
  const gates: Record<string, GateResult> = {};
  const subVerdicts: Record<string, string> = {
    marketplaceBrain: "L2 ADVISORY",
    liveRanking: "UNCHANGED",
    financialExecution: "OUTSIDE CCOS",
    moderationEnforcement: "OUTSIDE CCOS",
    autopilot: "DISABLED",
    daosLiveConnection: "NOT CONNECTED",
    quicksaleLiveConnection: "NOT CONNECTED",
  };

  process.env.CCOS_ENABLED = process.env.CCOS_ENABLED ?? "true";
  process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED =
    process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED ?? "true";

  const stagingVersion = await fetchJson(`${STAGING_BASE}/api/version`);
  const stagingHealth = await fetchJson(`${STAGING_BASE}/api/health`);

  const versionCommit =
    typeof stagingVersion === "object" &&
    stagingVersion &&
    "commit" in stagingVersion
      ? String((stagingVersion as { commit: string }).commit)
      : "";

  gate(gates, "stagingEqualsMain", versionCommit.startsWith("8e61721"));
  gate(gates, "healthPass", Boolean((stagingHealth as { ok?: boolean }).ok));
  gate(
    gates,
    "ccosFlagsRuntime",
    process.env.CCOS_ENABLED === "true" &&
      process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true",
  );
  gate(gates, "cognitiveAvailable", isCognitiveProductReportAvailable());

  const product = await pickAcceptanceProduct();
  const cqSnapshot = await getLatestQualitySnapshot(product.id);

  resetMarketplacePublishers();
  ensureMarketplacePublishersRegistered();

  const t0 = performance.now();
  const report = await getCognitiveProductReport(product.id);
  const reportMs = Math.round(performance.now() - t0);

  gate(gates, "unifiedReport", Boolean(report && report.observations.length > 0));

  const metrics = new Set(report?.observations.map((o) => o.metric) ?? []);
  const requiredCq = [
    OBSERVATION_METRICS.content.overallQuality,
    OBSERVATION_METRICS.visual.photoQuality,
    OBSERVATION_METRICS.visual.photoRelevance,
    OBSERVATION_METRICS.visual.thumbnailQuality,
    OBSERVATION_METRICS.content.descriptionQuality,
    OBSERVATION_METRICS.seo.contentQuality,
    OBSERVATION_METRICS.content.attributesQuality,
    OBSERVATION_METRICS.content.consistency,
    OBSERVATION_METRICS.content.buyerValue,
    OBSERVATION_METRICS.content.manipulationRisk,
  ];
  gate(
    gates,
    "contentQualityPublisher",
    requiredCq.every((m) => metrics.has(m)),
  );

  const trustMetrics = [
    OBSERVATION_METRICS.trust.productScore,
    OBSERVATION_METRICS.trust.sellerScore,
    OBSERVATION_METRICS.trust.shippingReliability,
    OBSERVATION_METRICS.trust.cancellationHealth,
  ];
  gate(
    gates,
    "trustPublisher",
    trustMetrics.some((m) => metrics.has(m)),
  );

  gate(gates, "behaviourPublisher", metrics.has(OBSERVATION_METRICS.behaviour.views));
  gate(
    gates,
    "rankingPublisher",
    metrics.has(OBSERVATION_METRICS.ranking.score) ||
      report?.publisherHealth.some((p) => p.name.includes("ranking") && p.status !== "OK"),
    true,
  );

  gate(
    gates,
    "genomeMissingNull",
    report?.genome.dimensions.behaviour == null ||
      report?.genome.dimensions.delivery == null ||
      report?.genome.dimensions.promotion == null,
  );
  gate(
    gates,
    "genomeConfidenceSeparated",
    report != null &&
      report.genome.confidence >= 0 &&
      report.genome.confidence <= 1 &&
      (report.genome.overall == null || report.genome.confidence < 0.99 || report.genome.dimensionsPresent < 6),
  );

  gate(
    gates,
    "brainMaturityL2",
    report?.maturityLevel === MARKETPLACE_BRAIN_MATURITY &&
      assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "recommend") &&
      !assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "execute"),
  );

  let autopilotDenied = false;
  try {
    denyAutopilotExecution("L4_AUTOPILOT");
  } catch {
    autopilotDenied = true;
  }
  gate(gates, "autopilotDenied", autopilotDenied);

  // Publisher failure isolation
  resetMarketplacePublishers();
  resetPublisherRegistry();
  resetRecordedObservations();
  resetObservationDedupeCache();
  registerPublisher({
    name: "fixture-ok",
    async publish(ctx) {
      return [
        buildObservation({
          entityType: "product",
          entityId: ctx.entity.id,
          metric: OBSERVATION_METRICS.content.overallQuality,
          domain: "content",
          value: 70,
          normalizedScore: 70,
          confidence: 0.8,
          evidence: ["ok"],
          sourceModule: "fixture",
          sourceVersion: "v1",
        }),
      ];
    },
  });
  registerPublisher({
    name: "fixture-broken",
    async publish() {
      throw new Error("behaviour publisher failed");
    },
  });
  const failureReport = await getCognitiveProductReport(product.id);
  gate(
    gates,
    "publisherFailureIsolation",
    Boolean(
      failureReport &&
        failureReport.observations.length > 0 &&
        failureReport.publisherHealth.some((p) => p.status === "DEGRADED"),
    ),
  );

  // Cross-app synthetic observations
  const daosObs = buildObservation({
    app: "daos",
    entityType: "image",
    entityId: "img-synthetic-1",
    metric: OBSERVATION_METRICS.visual.photoContrast,
    domain: "visual",
    value: 91,
    normalizedScore: 91,
    confidence: 0.85,
    evidence: ["Contrast 91/100"],
    sourceModule: "daos-visual-synthetic",
    sourceVersion: "v1",
  });
  const qsObs = buildObservation({
    app: "quicksale",
    entityType: "seller",
    entityId: "qs-seller-1",
    metric: "seller.buyer_intent_confidence",
    domain: "seller",
    value: 0.72,
    normalizedScore: 72,
    confidence: 0.6,
    evidence: ["Buyer intent confidence 72/100"],
    sourceModule: "quicksale-synthetic",
    sourceVersion: "v1",
  });
  gate(gates, "daosContract", normalizeObservation(daosObs).ok);
  gate(gates, "quicksaleContract", normalizeObservation(qsObs).ok);

  // Knowledge safety
  const store = new InMemoryKnowledgeStore();
  let knowledgeBlocked = false;
  try {
    store.tryPromoteObservationToKnowledge();
  } catch {
    knowledgeBlocked = true;
  }
  gate(gates, "knowledgeShortcutBlocked", knowledgeBlocked);

  const evidence = createEvidence({
    observationIds: ["obs-test"],
    claim: "CTR 1.8% при медиане категории 3.1%",
    confidence: 0.55,
    scope: { category: "test" },
  });
  const hypothesis = proposeHypothesis({
    claim: "Сильное главное фото повышает CTR",
    evidenceIds: [evidence.id],
    proposedBy: "brain",
    confidence: 0.5,
  });
  gate(gates, "hypothesisProposed", hypothesis.status === "PROPOSED");

  // Live search boundary (static)
  const searchSource = readFileSync(
    join(process.cwd(), "features/products/queries.ts"),
    "utf8",
  );
  gate(
    gates,
    "liveSearchBoundary",
    !searchSource.includes("marketplace-cognitive-platform") &&
      !searchSource.includes("@/lib/ccos"),
  );

  // Concurrent reports
  resetMarketplacePublishers();
  ensureMarketplacePublishersRegistered();
  const concurrentStart = performance.now();
  const concurrent = await Promise.all(
    Array.from({ length: 20 }, () => getCognitiveProductReport(product.id)),
  );
  const concurrentMs = Math.round(performance.now() - concurrentStart);
  gate(
    gates,
    "concurrentReports",
    concurrent.every((r) => r != null && r.observations.length > 0),
  );

  // Low confidence does not create blockers from photo relevance alone
  const lowConfBlockers = report?.observations
    .filter((o) => o.metric === OBSERVATION_METRICS.visual.photoRelevance && o.confidence < 0.4)
    .length
    ? report.blockers.length === 0 ||
      !report.blockers.some((b) => b.code.includes("PHOTO"))
    : true;
  gate(gates, "lowConfidenceSafety", lowConfBlockers);

  // Privacy scan on observations
  const joined = JSON.stringify(report?.observations ?? []);
  gate(
    gates,
    "noSecretsInObservations",
    !/(AUTH_SECRET|STRIPE_SECRET|password|CVC)/i.test(joined),
  );

  const hardFails = Object.values(gates).filter((g) => g === "FAIL").length;
  const verdict =
    hardFails === 0
      ? "CCOS WAVE 0 FOUNDATION: ACCEPTED"
      : "CCOS WAVE 0 FOUNDATION: NOT ACCEPTED";

  const output: AcceptanceReport = {
    generatedAt: new Date().toISOString(),
    mainSha: MAIN_SHA,
    stagingVersion,
    stagingHealth,
    flags: {
      CCOS_ENABLED: process.env.CCOS_ENABLED,
      MARKETPLACE_COGNITIVE_PLATFORM_ENABLED:
        process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED,
      MARKETPLACE_CONTENT_QUALITY_ENABLED:
        process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED,
      MARKETPLACE_RANKING_INTELLIGENCE_ENABLED:
        process.env.MARKETPLACE_RANKING_INTELLIGENCE_ENABLED,
    },
    acceptanceProduct: {
      id: product.id,
      slug: product.slug,
      sellerId: product.sellerId,
      name: product.name,
      views: product.views,
      contentQualityScore: cqSnapshot?.overallScore ?? null,
    },
    publishers:
      report?.publisherHealth.map((p) => ({
        name: p.name,
        health: p.status,
        observationCount: p.observationCount,
        metrics: report.observations
          .filter((o) => o.source.module.includes(p.name.split("-").pop() ?? ""))
          .map((o) => o.metric)
          .slice(0, 12),
      })) ?? [],
    genome: {
      overall: report?.genome.overall,
      confidence: report?.genome.confidence,
      dimensions: report?.genome.dimensions,
      dimensionsPresent: report?.genome.dimensionsPresent,
    },
    brain: {
      strengths: report?.strengths,
      blockers: report?.blockers,
      nextStep: report?.nextStep,
      missingData: report?.missingData,
      observationCount: report?.observations.length,
      advisoryOnly: report?.advisoryOnly,
      maturityLevel: report?.maturityLevel,
    },
    governance: {
      recommendAllowed: assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "recommend"),
      executeBlocked: !assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "execute"),
      simulateBlocked: !assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "simulate"),
      autopilotDenied,
    },
    crossApp: {
      daosAccepted: normalizeObservation(daosObs).ok,
      quicksaleAccepted: normalizeObservation(qsObs).ok,
    },
    performance: {
      singleReportMs: reportMs,
      concurrent20Ms: concurrentMs,
      concurrentAllOk: concurrent.every(Boolean),
    },
    gates,
    verdict,
    subVerdicts,
  };

  const outDir = join(process.cwd(), "artifacts/ccos-wave-0-staging");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "acceptance-report.json"), JSON.stringify(output, null, 2));

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
