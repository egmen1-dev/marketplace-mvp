import { buildCognitiveContext } from "@/lib/ccos/context/builder";
import type { CognitiveContext } from "@/lib/ccos/context/types";
import { createContextId } from "@/lib/ccos/context/types";
import { ADVISORY_ONLY, assertAdvisoryReport, denyAutopilotExecution } from "@/lib/ccos/governance";
import type { UniversalObservation } from "@/lib/ccos/observation/types";
import { collectObservations } from "@/lib/ccos/observation/registry";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import { trackCcosEvent } from "@/lib/ccos/telemetry";

import {
  MARKETPLACE_BRAIN_VERSION,
  resolveMarketplaceBrainMaturity,
} from "../../flags";
import { aggregateGenomeFromObservations } from "../../genome/aggregate";
import { buildMarketplaceGenomeV1 } from "../../genome/contextual";
import { ensureMarketplacePublishersRegistered } from "../../publishers/registry";
import { buildMarketplaceContextualSignals } from "../../signals/build-signals";
import { buildProvenance } from "../explain";
import { getKnowledgeRepository, isCcosKnowledgePlatformEnabled, KNOWLEDGE_PACK_VERSION } from "@/lib/ccos/knowledge";
import { currentMarketplaceBrainVersion } from "@/lib/ccos/knowledge/versions";

import {
  applyKnowledgeToCandidate,
  buildKnowledgeReasoning,
  finalizeRecommendation,
  seedDefaultMarketplaceKnowledge,
  summarizeEvidence,
} from "../knowledge-reasoning";
import { recommendationHasValidEvidence } from "@/lib/ccos/knowledge";

import { blockerFromObservations, orchestrateDecision } from "./decision";
import {
  buildExplanationLines,
  buildFactorDeltas,
  buildSellerSummary,
} from "./explain";
import {
  collectActionCandidates,
  selectNextBestAction,
} from "./next-action";
import { buildBrainSimulations } from "./prediction";
import type { MarketplaceBrainContextInput, MarketplaceBrainReport } from "./types";

export const BRAIN_V1_VERSION = MARKETPLACE_BRAIN_VERSION;

function hasBehaviourData(observations: UniversalObservation[]): boolean {
  return observations.some(
    (o) =>
      (o.metric === OBSERVATION_METRICS.behaviour.ctr ||
        o.metric === OBSERVATION_METRICS.behaviour.conversion) &&
      o.value != null,
  );
}

function qualityGateFailed(observations: Array<{ metric: string; value: unknown }>): boolean {
  return observations.some(
    (o) =>
      o.metric === OBSERVATION_METRICS.content.gateBlocked && o.value === true,
  );
}

function resolveEstimatedPosition(
  observations: Array<{ metric: string; value: unknown; confidence: number }>,
): MarketplaceBrainReport["estimatedPosition"] {
  const obs = observations.find(
    (o) => o.metric === OBSERVATION_METRICS.ranking.estimatedPosition,
  );
  if (!obs || obs.value == null) return undefined;
  return {
    value: typeof obs.value === "number" ? obs.value : Number(obs.value),
    confidence: obs.confidence,
    advisoryOnly: true,
  };
}

export async function getMarketplaceBrainReport(
  productId: string,
  contextInput?: MarketplaceBrainContextInput,
): Promise<MarketplaceBrainReport | null> {
  ensureMarketplacePublishersRegistered();
  denyAutopilotExecution(resolveMarketplaceBrainMaturity());

  const context = await buildCognitiveContext({
    productId,
    query: contextInput?.query,
    device: contextInput?.device,
    sessionGoal: contextInput?.sessionGoal,
    overrides: contextInput?.contextOverrides,
  });

  const { observations, publisherHealth } = await collectObservations({
    app: "marketplace",
    entity: { type: "product", id: productId },
    context,
  });

  if (observations.length === 0 && publisherHealth.every((p) => p.status === "SKIPPED")) {
    return null;
  }

  const baseGenome = aggregateGenomeFromObservations(observations);
  const signals = buildMarketplaceContextualSignals(observations, context);
  const genome = buildMarketplaceGenomeV1(baseGenome, context, signals);

  const gateFailed = qualityGateFailed(observations);
  const blockers = blockerFromObservations(observations);
  const decision = orchestrateDecision({
    observations,
    blockers,
    qualityGateFailed: gateFailed,
  });

  const behaviourPresent = hasBehaviourData(observations);
  let actionCandidates = collectActionCandidates({
    observations,
    signals,
    productId,
    qualityGateFailed: gateFailed,
    hasBehaviourData: behaviourPresent,
  });

  if (isCcosKnowledgePlatformEnabled()) {
    seedDefaultMarketplaceKnowledge(getKnowledgeRepository());
    const verifiedFacts = getKnowledgeRepository().listVerifiedFacts("marketplace");
    actionCandidates = actionCandidates.map((c) => applyKnowledgeToCandidate(c, verifiedFacts));
  }

  const { primary: nextBestActionRaw, primaryCandidate, candidates: rankedCandidates } =
    selectNextBestAction(actionCandidates, decision);

  const knowledgeReasoning = isCcosKnowledgePlatformEnabled()
    ? buildKnowledgeReasoning({
        observations,
        signals,
        context,
        primaryAction: primaryCandidate,
      })
    : null;

  let nextBestAction = nextBestActionRaw;
  if (knowledgeReasoning && nextBestActionRaw) {
    if (recommendationHasValidEvidence(knowledgeReasoning.evidence)) {
      nextBestAction = finalizeRecommendation(nextBestActionRaw, knowledgeReasoning.evidence);
    } else {
      nextBestAction = {
        ...nextBestActionRaw,
        evidence: summarizeEvidence(knowledgeReasoning.evidence),
      };
    }
    if (nextBestAction && knowledgeReasoning.verifiedFacts.length > 0) {
      nextBestAction.knowledgeFactIds = knowledgeReasoning.verifiedFacts.slice(0, 2).map((f) => f.id);
    }
  }

  const simulations = await buildBrainSimulations({
    productId,
    includeSimulations:
      contextInput?.includeSimulations ??
      resolveMarketplaceBrainMaturity() === "L3_SIMULATOR",
    topActionTitle: nextBestAction?.title ?? null,
  });

  const { strengths, weaknesses } = buildFactorDeltas(signals);
  const summary = buildSellerSummary({
    context,
    strengths,
    weaknesses,
    nextBestAction,
    simulations,
    contextualOverall: genome.contextual.overall,
  });
  const explanation = buildExplanationLines({ summary, strengths, weaknesses });

  const confidence = Math.min(
    1,
    baseGenome.confidence * 0.45 +
      context.confidence.overall * 0.25 +
      genome.contextual.confidence * 0.3,
  );

  const report: MarketplaceBrainReport = {
    productId,
    context,
    observations,
    signals,
    genome,
    estimatedPosition: resolveEstimatedPosition(observations),
    strengths,
    weaknesses,
    blockers,
    nextBestAction,
    actionCandidates: rankedCandidates,
    simulations,
    explanation,
    summary,
    decision,
    confidence,
    maturity: resolveMarketplaceBrainMaturity(),
    brainVersion: isCcosKnowledgePlatformEnabled()
      ? currentMarketplaceBrainVersion()
      : BRAIN_V1_VERSION,
    advisoryOnly: ADVISORY_ONLY,
    publisherHealth,
    provenance: buildProvenance(observations),
    knowledgeFactIds: knowledgeReasoning?.verifiedFacts.map((f) => f.id) ?? [],
    recommendationEvidence: nextBestAction?.evidence ?? [],
    reasoningPackVersion: knowledgeReasoning?.reasoningPackVersion ?? "reasoning-pack-v1",
    knowledgePackVersion: KNOWLEDGE_PACK_VERSION,
  };

  trackCcosEvent("ccos_brain_report_generated");

  return assertAdvisoryReport(report);
}

/** Build context without product DB load — for unit tests. */
export function buildTestBrainContext(
  productId: string,
  partial?: Partial<CognitiveContext>,
): CognitiveContext {
  const id = partial?.id ?? createContextId(productId);
  return {
    id,
    contextVersion: partial?.contextVersion ?? "context-v1",
    confidence: partial?.confidence ?? {
      overall: 0.5,
      query: 0.5,
      category: 0.5,
    },
    fingerprint: partial?.fingerprint ?? `fp_test_${productId}`,
    createdAt: partial?.createdAt ?? new Date().toISOString(),
    ...partial,
  };
}
