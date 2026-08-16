/** EPIC-77-WAVE-6 — Cognitive Evolution Engine types */

export type EvolvableArtifactType =
  | "brain"
  | "knowledge_pack"
  | "graph_policy"
  | "reasoning_policy"
  | "action_policy";

export type BrainVersionStatus =
  | "CURRENT"
  | "CANDIDATE"
  | "VALIDATING"
  | "APPROVED"
  | "PROMOTED"
  | "REJECTED"
  | "ROLLED_BACK"
  | "ARCHIVED";

export type ChangeType =
  | "WEIGHT_CHANGE"
  | "KNOWLEDGE_PACK_CHANGE"
  | "REASONING_POLICY_CHANGE"
  | "ACTION_PRIORITY_CHANGE"
  | "GRAPH_POLICY_CHANGE";

export type ValidationStage =
  | "STRUCTURAL_VALIDATION"
  | "REGRESSION_VALIDATION"
  | "GRAPH_VALIDATION"
  | "TWIN_VALIDATION"
  | "SHADOW_VALIDATION"
  | "RISK_VALIDATION"
  | "HUMAN_APPROVAL";

export type RiskTier = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BrainPolicyWeights = {
  quality: number;
  relevance: number;
  promotion: number;
  thumbnail: number;
  trust: number;
  coldStart: number;
  newSeller: number;
};

export type ChangeSetEntry = {
  changeType: ChangeType;
  field: string;
  from: string | number;
  to: string | number;
  reason?: string;
};

export type ChangeSet = {
  baseVersion: string;
  candidateVersion: string;
  summary: string;
  entries: ChangeSetEntry[];
  evidenceIds: string[];
  experimentIds: string[];
};

export interface CognitiveBrainVersion {
  id: string;
  brainId: string;
  version: string;
  status: BrainVersionStatus;
  parentVersionId?: string;
  knowledgePackVersion: string;
  graphVersion: string;
  reasoningPolicyVersion: string;
  actionPolicyVersion: string;
  policyWeights: BrainPolicyWeights;
  createdAt: string;
  changeSet: ChangeSet;
  provenance: {
    sourceExperimentIds: string[];
    sourceKnowledgeIds: string[];
    sourceHypothesisIds: string[];
    createdReason: string;
    createdBy: string;
  };
  fingerprint: string;
  validationStage?: ValidationStage;
  validationResults?: ValidationResultBundle;
  riskScore?: number;
  riskTier?: RiskTier;
  blastRadius?: BlastRadius;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectReason?: string;
  promotedAt?: string;
  rolledBackAt?: string;
}

export interface CognitiveVersionBundle {
  brainVersion: string;
  knowledgePackVersion: string;
  graphVersion: string;
  reasoningPolicyVersion: string;
  actionPolicyVersion: string;
}

export type EvolutionDelta = {
  metric: string;
  current: number;
  candidate: number;
  delta: number;
};

export interface EvolutionShadowResult {
  currentVersion: string;
  candidateVersion: string;
  entityId: string;
  contextFingerprint: string;
  currentDecision: Record<string, unknown>;
  candidateDecision: Record<string, unknown>;
  deltas: EvolutionDelta[];
  disagreementRate: number;
  criticalDisagreement: boolean;
  createdAt: string;
}

export type BlastRadius = {
  affectedProducts: number;
  affectedCategories: number;
  affectedSellers: number;
  affectedBrainCapabilities: string[];
};

export type ValidationStageResult = {
  stage: ValidationStage;
  passed: boolean;
  detail: string;
  metrics?: Record<string, number | string | boolean>;
};

export type ValidationResultBundle = {
  stages: ValidationStageResult[];
  passed: boolean;
  completedAt: string;
  cacheKey: string;
};

export type TwinComparisonReport = {
  currentVersion: string;
  candidateVersion: string;
  metrics: Array<{
    name: string;
    current: number;
    candidate: number;
    delta: number;
    confidence: number;
    risk: number;
    coverage: number;
  }>;
  multiObjectivePass: boolean;
  safetyMetrics: Record<string, number>;
};

export type EvolutionMemoryEventKind =
  | "candidate_created"
  | "validation_started"
  | "validation_failed"
  | "validation_passed"
  | "shadow_started"
  | "approval_requested"
  | "approved"
  | "rejected"
  | "promoted"
  | "rollback_recommended"
  | "rolled_back";

export type EvolutionMemoryEvent = {
  id: string;
  kind: EvolutionMemoryEventKind;
  candidateId?: string;
  actor: string;
  detail: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type ProductionBundleSnapshot = {
  bundle: CognitiveVersionBundle;
  savedAt: string;
  reason: "pre_promotion" | "manual";
};

export const DEFAULT_BRAIN_POLICY_WEIGHTS: BrainPolicyWeights = {
  quality: 0.28,
  relevance: 0.24,
  promotion: 0.08,
  thumbnail: 0.14,
  trust: 0.18,
  coldStart: 0.04,
  newSeller: 0.04,
};

export const BRAIN_SCHEMA_VERSION = "brain-schema-v1";
export const MIN_SUPPORTED_BRAIN_SCHEMA_VERSION = "brain-schema-v1";
