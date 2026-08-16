import type { UniversalObservation } from "../observation/types";
import type {
  KnowledgeAuthor,
  KnowledgeEvidence,
  KnowledgeScope,
  KnowledgeSourceRef,
} from "./types";
import { marketplaceScope } from "./scope";

export const EVIDENCE_ENGINE_VERSION = "evidence-engine-v1";

function sourceFromObservation(obs: UniversalObservation): KnowledgeSourceRef {
  return {
    system: obs.app,
    module: obs.source.module,
    version: obs.source.version,
    refId: obs.id,
  };
}

export function buildEvidenceFromObservations(input: {
  observations: UniversalObservation[];
  scope?: Partial<KnowledgeScope>;
  author?: KnowledgeAuthor;
}): KnowledgeEvidence[] {
  const evidence: KnowledgeEvidence[] = [];
  const author = input.author ?? { type: "brain", label: "evidence-engine" };

  for (const obs of input.observations) {
    if (obs.evidence.length === 0 && obs.value == null && obs.normalizedScore == null) {
      continue;
    }

    const claim =
      obs.evidence[0] ??
      (obs.normalizedScore != null
        ? `${obs.metric}: ${obs.normalizedScore}/100`
        : `${obs.metric}: ${String(obs.value)}`);

    evidence.push({
      id: `ev_${obs.id}`,
      observationIds: [obs.id],
      claim,
      confidence: obs.confidence,
      scope: {
        ...marketplaceScope(),
        ...input.scope,
        pack: input.scope?.pack ?? "marketplace",
      },
      sources: [sourceFromObservation(obs)],
      author,
      createdAt: new Date().toISOString(),
    });
  }

  return evidence;
}

export function buildEvidenceFromSignals(input: {
  signals: Array<{ explanation: string; confidence: number; domain: string; metric: string }>;
  observationIds: string[];
  scope?: Partial<KnowledgeScope>;
}): KnowledgeEvidence[] {
  return input.signals.map((signal, index) => ({
    id: `ev_sig_${index}_${Date.now()}`,
    observationIds: input.observationIds,
    claim: signal.explanation,
    confidence: signal.confidence,
    scope: {
      pack: "marketplace",
      ...input.scope,
    },
    sources: [
      {
        system: "marketplace",
        module: "contextual-signals",
        version: EVIDENCE_ENGINE_VERSION,
      },
    ],
    author: { type: "brain", label: "signal-interpreter" },
    createdAt: new Date().toISOString(),
  }));
}

export function mergeEvidenceClaims(evidence: KnowledgeEvidence[]): string[] {
  return evidence.map((e) => e.claim);
}

export function recommendationHasValidEvidence(evidence: KnowledgeEvidence[]): boolean {
  return evidence.length > 0 && evidence.every((e) => e.claim.length > 0 && e.confidence > 0);
}

export function assertRecommendationEvidence(evidence: KnowledgeEvidence[]): void {
  if (!recommendationHasValidEvidence(evidence)) {
    throw new Error("Recommendation requires at least one valid Evidence item");
  }
}
