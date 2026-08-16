import type { AppId } from "../observation/types";

export type HypothesisStatus =
  | "PROPOSED"
  | "TESTING"
  | "CONFIRMED"
  | "REJECTED"
  | "INCONCLUSIVE";

/** Wave 2 lowercase canonical statuses */
export type KnowledgeStatus = "candidate" | "verified" | "deprecated" | "archived";

/** Legacy Wave 0 uppercase — mapped in repository helpers */
export type LegacyKnowledgeStatus = "CANDIDATE" | "VERIFIED" | "DEPRECATED";

export type KnowledgePackId =
  | "marketplace"
  | "design"
  | "search"
  | "trust"
  | "finance"
  | "promotion"
  | "seller"
  | "buyer";

export type KnowledgeAuthorType =
  | "human"
  | "learning_engine"
  | "brain"
  | "experiment"
  | "seller_feedback";

export interface KnowledgeAuthor {
  type: KnowledgeAuthorType;
  id?: string;
  label?: string;
}

export interface KnowledgeSourceRef {
  system: string;
  module: string;
  version: string;
  refId?: string;
}

export interface KnowledgeScope {
  pack: KnowledgePackId;
  categories?: string[];
  categorySlugs?: string[];
  priceRange?: { min?: number; max?: number };
  season?: string;
  device?: string;
  apps?: AppId[];
  regions?: string[];
  /** Cross-category guard — empty means pack-global within pack boundaries */
  crossCategory?: boolean;
}

export interface KnowledgeEvidence {
  id: string;
  observationIds: string[];
  claim: string;
  confidence: number;
  scope: KnowledgeScope;
  sources: KnowledgeSourceRef[];
  author: KnowledgeAuthor;
  createdAt: string;
  feedbackIds?: string[];
}

export interface KnowledgeTimelineEntry {
  at: string;
  event:
    | "created"
    | "candidate"
    | "verified"
    | "confidence_changed"
    | "deprecated"
    | "archived"
    | "experiment_linked";
  reason: string;
  confidence?: number;
  author: KnowledgeAuthor;
  experimentId?: string;
}

export interface KnowledgeVersion {
  id: string;
  factId: string;
  version: number;
  confidence: number;
  changedAt: string;
  reason: string;
  author: KnowledgeAuthor;
  brainVersion: string;
  knowledgePackVersion: string;
}

export interface KnowledgeFact {
  id: string;
  title: string;
  description: string;
  confidence: number;
  scope: KnowledgeScope;
  status: KnowledgeStatus;
  createdAt: string;
  verifiedAt?: string;
  deprecatedAt?: string;
  archivedAt?: string;
  brainVersion: string;
  knowledgeVersion: string;
  sources: KnowledgeSourceRef[];
  evidenceIds: string[];
  experimentIds?: string[];
  hypothesisId?: string;
  author: KnowledgeAuthor;
  timeline: KnowledgeTimelineEntry[];
}

export interface KnowledgeCandidate extends KnowledgeFact {
  status: "candidate";
}

export interface CognitiveHypothesis {
  id: string;
  title: string;
  claim: string;
  evidenceIds: string[];
  confidence: number;
  status: HypothesisStatus;
  proposedBy: KnowledgeAuthorType;
  experimentIds?: string[];
  createdAt: string;
}

/** @deprecated alias — use KnowledgeEvidence */
export type CognitiveEvidence = KnowledgeEvidence;

/** @deprecated alias — use KnowledgeFact */
export type CognitiveKnowledgeFact = KnowledgeFact & {
  claim: string;
  validFrom: string;
  validUntil?: string;
  sourceApps: AppId[];
  usedByBrains: string[];
  version: string;
};

export type ExperimentVerdict = "positive" | "negative" | "inconclusive" | "pending";

export interface CcosExperiment {
  id: string;
  title: string;
  goal: string;
  dataset: string;
  metrics: string[];
  result?: Record<string, unknown>;
  brainVersion: string;
  experimentVersion: string;
  knowledgeProducedIds: string[];
  hypothesisId?: string;
  verdict: ExperimentVerdict;
  status: "draft" | "running" | "completed" | "cancelled";
  scope: KnowledgeScope;
  createdAt: string;
  completedAt?: string;
}

export interface BrainVersionRegistryEntry {
  brainVersion: string;
  knowledgePackVersion: string;
  reasoningPackVersion: string;
  experimentVersion: string;
  releasedAt: string;
  notes?: string;
}

export interface SellerFeedbackRecord {
  id: string;
  productId: string;
  recommendationId: string;
  recommendationTitle: string;
  outcome: "helped" | "not_helped" | "partial";
  comment?: string;
  evidenceId?: string;
  createdAt: string;
}

export interface BrainSnapshot {
  productId: string;
  brainVersion: string;
  syncVersion: string;
  offlineTimestamp: string;
  contextFingerprint: string;
  payload: Record<string, unknown>;
}

export interface KnowledgeSnapshot {
  syncVersion: string;
  offlineTimestamp: string;
  packs: KnowledgePackId[];
  verifiedFactIds: string[];
  facts: KnowledgeFact[];
}

/**
 * Knowledge pipeline (strict):
 * Observation → Evidence → Hypothesis → Experiment → Candidate Knowledge
 * → Verification → Verified Knowledge → Memory
 *
 * Observations MUST NOT become production rules directly.
 */
