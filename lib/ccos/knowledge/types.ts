import type { AppId } from "../observation/types";

export type HypothesisStatus =
  | "PROPOSED"
  | "TESTING"
  | "CONFIRMED"
  | "REJECTED"
  | "INCONCLUSIVE";

export type KnowledgeStatus = "CANDIDATE" | "VERIFIED" | "DEPRECATED";

export interface CognitiveEvidence {
  id: string;
  observationIds: string[];
  claim: string;
  confidence: number;
  scope: Record<string, unknown>;
  createdAt: string;
}

export interface CognitiveHypothesis {
  id: string;
  title: string;
  claim: string;
  evidenceIds: string[];
  confidence: number;
  status: HypothesisStatus;
  proposedBy: "human" | "learning_engine" | "brain" | "experiment";
  createdAt: string;
}

export interface CognitiveKnowledgeFact {
  id: string;
  claim: string;
  scope: Record<string, unknown>;
  confidence: number;
  status: KnowledgeStatus;
  evidenceIds: string[];
  experimentIds?: string[];
  validFrom: string;
  validUntil?: string;
  sourceApps: AppId[];
  usedByBrains: string[];
  version: string;
}

/**
 * Knowledge pipeline (strict):
 * Observation → Evidence → Hypothesis → Experiment → Verified Knowledge
 * → Candidate Brain Version → Validation → Human Approval → Production
 *
 * Observations MUST NOT become production rules directly.
 */
