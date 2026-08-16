import type { CognitiveContext } from "@/lib/ccos/context/types";
import type { KnowledgeEvidence, KnowledgeFact } from "@/lib/ccos/knowledge/types";
import {
  assertRecommendationEvidence,
  buildEvidenceFromObservations,
  buildEvidenceFromSignals,
  getBrainReadableKnowledge,
  mergeEvidenceClaims,
} from "@/lib/ccos/knowledge";
import type { ContextualSignal } from "@/lib/ccos/signals/types";
import type { UniversalObservation } from "@/lib/ccos/observation/types";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";

import type { ActionCandidate, BrainEvidenceSummary, BrainRecommendation } from "./v1/types";

export const REASONING_PACK_VERSION = "reasoning-pack-v2";

export type KnowledgeReasoningResult = {
  verifiedFacts: KnowledgeFact[];
  evidence: KnowledgeEvidence[];
  reasoningPackVersion: string;
};

export function loadVerifiedKnowledgeForContext(context: CognitiveContext): KnowledgeFact[] {
  return getBrainReadableKnowledge({
    pack: "marketplace",
    categoryId: context.category?.id,
    categorySlug: context.category?.slug,
    season: context.market?.season,
    device: context.device?.type,
  });
}

export function buildRecommendationEvidence(input: {
  observations: UniversalObservation[];
  signals: ContextualSignal[];
  context: CognitiveContext;
  actionId: string;
  verifiedFacts: KnowledgeFact[];
}): KnowledgeEvidence[] {
  const scope = {
    pack: "marketplace" as const,
    categories: input.context.category?.id ? [input.context.category.id] : undefined,
    categorySlugs: input.context.category?.slug ? [input.context.category.slug] : undefined,
    season: input.context.market?.season,
    device: input.context.device?.type,
  };

  const relatedObs = input.observations.filter((o) => {
    if (input.actionId.includes("photo") || input.actionId.includes("hero")) {
      return (
        o.metric === OBSERVATION_METRICS.visual.photoQuality ||
        o.metric === OBSERVATION_METRICS.visual.thumbnailQuality
      );
    }
    if (input.actionId.includes("ctr") || input.actionId.includes("behaviour")) {
      return o.metric === OBSERVATION_METRICS.behaviour.ctr;
    }
    if (input.actionId.includes("quality")) {
      return o.domain === "content" || o.metric === OBSERVATION_METRICS.content.gateBlocked;
    }
    return true;
  });

  const obsEvidence = buildEvidenceFromObservations({
    observations: relatedObs.slice(0, 4),
    scope,
  });

  const signalEvidence = buildEvidenceFromSignals({
    signals: input.signals.slice(0, 3),
    observationIds: input.observations.map((o) => o.id),
    scope,
  });

  const factEvidence: KnowledgeEvidence[] = input.verifiedFacts.slice(0, 2).map((fact) => ({
    id: `ev_fact_${fact.id}`,
    observationIds: [],
    claim: fact.description,
    confidence: fact.confidence,
    scope: fact.scope,
    sources: fact.sources,
    author: fact.author,
    createdAt: new Date().toISOString(),
  }));

  return [...obsEvidence, ...signalEvidence, ...factEvidence];
}

export function summarizeEvidence(evidence: KnowledgeEvidence[]): BrainEvidenceSummary[] {
  return evidence.map((e) => ({
    claim: e.claim,
    confidence: e.confidence,
    source: e.sources[0]?.module,
  }));
}

export function applyKnowledgeToCandidate(
  candidate: ActionCandidate,
  verifiedFacts: KnowledgeFact[],
): ActionCandidate {
  const match = verifiedFacts.find((f) => {
    const t = `${f.title} ${f.description}`.toLowerCase();
    if (candidate.id.includes("photo") && (t.includes("фото") || t.includes("photo"))) return true;
    if (candidate.id.includes("ctr") && t.includes("ctr")) return true;
    if (candidate.id.includes("quality") && t.includes("качеств")) return true;
    return false;
  });
  if (!match) return candidate;
  return {
    ...candidate,
    score: candidate.score + match.confidence * 0.15,
    why: `${candidate.why} (Verified Knowledge: ${match.title})`,
  };
}

export function finalizeRecommendation(
  recommendation: BrainRecommendation | null,
  evidence: KnowledgeEvidence[],
): BrainRecommendation | null {
  if (!recommendation) return null;
  const summary = summarizeEvidence(evidence);
  assertRecommendationEvidence(evidence);
  return {
    ...recommendation,
    evidence: summary,
    why: mergeEvidenceClaims(evidence).slice(0, 3).join("; ") || recommendation.why,
  };
}

export function buildKnowledgeReasoning(input: {
  observations: UniversalObservation[];
  signals: ContextualSignal[];
  context: CognitiveContext;
  primaryAction: ActionCandidate | null;
}): KnowledgeReasoningResult {
  const verifiedFacts = loadVerifiedKnowledgeForContext(input.context);
  const evidence = input.primaryAction
    ? buildRecommendationEvidence({
        observations: input.observations,
        signals: input.signals,
        context: input.context,
        actionId: input.primaryAction.id,
        verifiedFacts,
      })
    : buildEvidenceFromObservations({
        observations: input.observations.slice(0, 3),
        scope: { pack: "marketplace", categories: input.context.category?.id ? [input.context.category.id] : undefined },
      });

  return {
    verifiedFacts,
    evidence,
    reasoningPackVersion: REASONING_PACK_VERSION,
  };
}

/** Dev/test seed — verified marketplace knowledge (not auto-promoted from observations). */
export function seedDefaultMarketplaceKnowledge(repo: {
  saveFact: (f: KnowledgeFact) => KnowledgeFact;
  listVerifiedFacts: () => KnowledgeFact[];
}): void {
  if (repo.listVerifiedFacts().length > 0) return;

  const now = new Date().toISOString();
  repo.saveFact({
    id: "kf_verified_hero_photo_v1",
    title: "Главное фото крупным планом",
    description:
      "В TOP-20 категории у 93% сильных карточек есть крупный план товара на главном фото.",
    confidence: 0.82,
    scope: { pack: "marketplace", crossCategory: false },
    status: "verified",
    createdAt: now,
    verifiedAt: now,
    brainVersion: "marketplace-brain-v2-knowledge",
    knowledgeVersion: "knowledge-pack-v2",
    sources: [{ system: "ranking-lab", module: "top-explainer", version: "v1" }],
    evidenceIds: [],
    author: { type: "human", label: "ranking-lab-review" },
    timeline: [
      {
        at: now,
        event: "verified",
        reason: "Ranking lab experiment batch",
        author: { type: "human", label: "admin" },
        confidence: 0.82,
      },
    ],
  });

  repo.saveFact({
    id: "kf_verified_ctr_photo_v1",
    title: "CTR и первое фото",
    description: "Слабое первое фото часто снижает CTR относительно медианы категории.",
    confidence: 0.78,
    scope: { pack: "marketplace", categorySlugs: ["ventilyatory", "fans"] },
    status: "verified",
    createdAt: now,
    verifiedAt: now,
    brainVersion: "marketplace-brain-v2-knowledge",
    knowledgeVersion: "knowledge-pack-v2",
    sources: [{ system: "ccos", module: "experiment-registry", version: "v1" }],
    evidenceIds: [],
    author: { type: "experiment", id: "ranking-lab-ctr-photo" },
    timeline: [
      {
        at: now,
        event: "verified",
        reason: "Sensitivity lab + human approval",
        author: { type: "human", label: "admin" },
        confidence: 0.78,
      },
    ],
  });
}
