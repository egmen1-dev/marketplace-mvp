import {
  currentMarketplaceBrainVersion,
  getBrainVersionRegistry,
  KNOWLEDGE_PACK_VERSION,
} from "@/lib/ccos/knowledge/versions";
import { listGraphVersions } from "@/lib/ccos/graph/versioning";

/** Evolution readiness contracts — no Evolution Engine in PRE-WAVE-6 */

export type CognitiveArtifactType = "brain_version" | "knowledge_version" | "graph_version";

export type CognitiveApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CognitiveApproval {
  id: string;
  artifactType: CognitiveArtifactType;
  artifactId: string;
  status: CognitiveApprovalStatus;
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reason?: string;
}

export interface ShadowEvaluationInput {
  currentBrainVersion: string;
  candidateBrainVersion: string;
  entityId: string;
  observations: import("@/lib/ccos/observation/types").UniversalObservation[];
}

export interface ShadowEvaluationResult {
  contractVersion: "shadow-evaluation-v1";
  currentBrainVersion: string;
  candidateBrainVersion: string;
  recommendationDelta: number;
  confidenceDelta: number;
  advisoryOnly: true;
  status: "STUB";
}

export function createShadowEvaluationStub(input: ShadowEvaluationInput): ShadowEvaluationResult {
  return {
    contractVersion: "shadow-evaluation-v1",
    currentBrainVersion: input.currentBrainVersion,
    candidateBrainVersion: input.candidateBrainVersion,
    recommendationDelta: 0,
    confidenceDelta: 0,
    advisoryOnly: true,
    status: "STUB",
  };
}

export interface VersionPointerSet {
  brain: { current: string; previous: string | null };
  graph: { current: string; previous: string | null };
  knowledge: { current: string; previous: string | null };
}

export function resolveVersionPointers(): VersionPointerSet {
  const brainRegistry = getBrainVersionRegistry();
  const currentBrain = currentMarketplaceBrainVersion();
  const brainIdx = brainRegistry.findIndex((r) => r.brainVersion === currentBrain);
  const graphVersions = listGraphVersions();

  return {
    brain: {
      current: currentBrain,
      previous: brainIdx > 0 ? brainRegistry[brainIdx - 1]?.brainVersion ?? null : null,
    },
    graph: {
      current: graphVersions.at(-1)?.version ?? "graph-engine-v1.0",
      previous: graphVersions.length > 1 ? graphVersions.at(-2)?.version ?? null : null,
    },
    knowledge: {
      current: KNOWLEDGE_PACK_VERSION,
      previous: "knowledge-pack-v1",
    },
  };
}
