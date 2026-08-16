import { getActiveBrainVersion } from "@/lib/ccos/rollback/brain";
import { getActiveGraphVersion } from "@/lib/ccos/graph/versioning";
import { getActiveKnowledgePackVersion } from "@/lib/ccos/rollback/knowledge";
import {
  currentMarketplaceBrainVersion,
  resolveBrainVersionEntry,
} from "@/lib/ccos/knowledge/versions";

import { buildChangeSet } from "./change-set";
import { computeCandidateFingerprint } from "./fingerprint";
import { appendEvolutionMemoryEvent } from "./memory";
import type {
  BrainPolicyWeights,
  ChangeSetEntry,
  CognitiveBrainVersion,
  CognitiveVersionBundle,
  ProductionBundleSnapshot,
} from "./types";
import { DEFAULT_BRAIN_POLICY_WEIGHTS as DEFAULT_WEIGHTS } from "./types";

const candidates = new Map<string, CognitiveBrainVersion>();
let currentProductionBundle: CognitiveVersionBundle | null = null;
let prePromotionSnapshot: ProductionBundleSnapshot | null = null;
let candidateCounter = 0;

export function resetEvolutionRegistry(): void {
  candidates.clear();
  currentProductionBundle = null;
  prePromotionSnapshot = null;
  candidateCounter = 0;
}

export function resolveProductionBundle(): CognitiveVersionBundle {
  const activeBrain = getActiveBrainVersion();
  const entry = resolveBrainVersionEntry(activeBrain);
  return {
    brainVersion: activeBrain,
    knowledgePackVersion: getActiveKnowledgePackVersion(),
    graphVersion: getActiveGraphVersion(),
    reasoningPolicyVersion: entry.reasoningPackVersion,
    actionPolicyVersion: entry.reasoningPackVersion,
  };
}

export function getCurrentProductionBundle(): CognitiveVersionBundle {
  return currentProductionBundle ?? resolveProductionBundle();
}

export function getPrePromotionSnapshot(): ProductionBundleSnapshot | null {
  return prePromotionSnapshot;
}

export function savePrePromotionSnapshot(reason: ProductionBundleSnapshot["reason"] = "pre_promotion"): ProductionBundleSnapshot {
  const snapshot: ProductionBundleSnapshot = {
    bundle: resolveProductionBundle(),
    savedAt: new Date().toISOString(),
    reason,
  };
  prePromotionSnapshot = snapshot;
  return snapshot;
}

export function registerCandidate(candidate: CognitiveBrainVersion): CognitiveBrainVersion {
  candidates.set(candidate.id, candidate);
  return candidate;
}

export function getCandidate(id: string): CognitiveBrainVersion | null {
  return candidates.get(id) ?? null;
}

export function listCandidates(filter?: { status?: CognitiveBrainVersion["status"] }): CognitiveBrainVersion[] {
  const all = [...candidates.values()];
  if (!filter?.status) return all;
  return all.filter((c) => c.status === filter.status);
}

export function getPendingCandidate(): CognitiveBrainVersion | null {
  return (
    [...candidates.values()].find((c) =>
      ["CANDIDATE", "VALIDATING", "APPROVED"].includes(c.status),
    ) ?? null
  );
}

export function updateCandidate(id: string, patch: Partial<CognitiveBrainVersion>): CognitiveBrainVersion {
  const existing = candidates.get(id);
  if (!existing) throw new Error(`Candidate not found: ${id}`);
  const updated = { ...existing, ...patch };
  candidates.set(id, updated);
  return updated;
}

export function resolveBasePolicyWeights(baseVersion: string): BrainPolicyWeights {
  const entry = resolveBrainVersionEntry(baseVersion);
  void entry;
  return { ...DEFAULT_WEIGHTS };
}

export function createBrainCandidate(input: {
  baseVersion?: string;
  changeSetEntries: ChangeSetEntry[];
  evidence?: { knowledgeIds?: string[]; experimentIds?: string[]; hypothesisIds?: string[] };
  reason: string;
  createdBy: string;
  policyWeights?: Partial<BrainPolicyWeights>;
  candidateVersionLabel?: string;
}): CognitiveBrainVersion {
  const baseVersion = input.baseVersion ?? getActiveBrainVersion() ?? currentMarketplaceBrainVersion();
  const baseEntry = resolveBrainVersionEntry(baseVersion);
  const weights = { ...resolveBasePolicyWeights(baseVersion), ...input.policyWeights };

  for (const entry of input.changeSetEntries) {
    if (entry.changeType === "WEIGHT_CHANGE" && entry.field in weights) {
      (weights as Record<string, number>)[entry.field] = Number(entry.to);
    }
  }

  candidateCounter += 1;
  const versionLabel = input.candidateVersionLabel ?? `marketplace-brain-candidate-v${candidateCounter}`;
  const changeSet = buildChangeSet({
    baseVersion,
    candidateVersion: versionLabel,
    entries: input.changeSetEntries,
    evidenceIds: input.evidence?.knowledgeIds,
    experimentIds: input.evidence?.experimentIds,
    reason: input.reason,
  });

  const bundle = resolveProductionBundle();
  const candidate: CognitiveBrainVersion = {
    id: `brain-candidate-${candidateCounter}`,
    brainId: "marketplace-brain",
    version: versionLabel,
    status: "CANDIDATE",
    parentVersionId: baseVersion,
    knowledgePackVersion: bundle.knowledgePackVersion,
    graphVersion: bundle.graphVersion,
    reasoningPolicyVersion: baseEntry.reasoningPackVersion,
    actionPolicyVersion: baseEntry.reasoningPackVersion,
    policyWeights: weights,
    createdAt: new Date().toISOString(),
    changeSet,
    provenance: {
      sourceExperimentIds: input.evidence?.experimentIds ?? [],
      sourceKnowledgeIds: input.evidence?.knowledgeIds ?? [],
      sourceHypothesisIds: input.evidence?.hypothesisIds ?? [],
      createdReason: input.reason,
      createdBy: input.createdBy,
    },
    fingerprint: computeCandidateFingerprint({
      baseVersion,
      changeSet,
      knowledgePackVersion: bundle.knowledgePackVersion,
      graphVersion: bundle.graphVersion,
      reasoningPolicyVersion: baseEntry.reasoningPackVersion,
      actionPolicyVersion: baseEntry.reasoningPackVersion,
    }),
  };

  registerCandidate(candidate);
  appendEvolutionMemoryEvent({
    kind: "candidate_created",
    candidateId: candidate.id,
    actor: input.createdBy,
    detail: changeSet.summary,
  });

  return candidate;
}

export function setCurrentProductionBundle(bundle: CognitiveVersionBundle): void {
  currentProductionBundle = bundle;
}
