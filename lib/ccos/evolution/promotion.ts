import { setActiveGraphVersion } from "@/lib/ccos/graph/versioning";
import { getActiveBrainVersion, setActiveBrainVersionForPromotion } from "@/lib/ccos/rollback/brain";
import { setActiveKnowledgePackVersionForPromotion } from "@/lib/ccos/rollback/knowledge";

import { getCandidate, savePrePromotionSnapshot, setCurrentProductionBundle, updateCandidate } from "./candidate";
import { assertEvolutionPlatformEnabled, assertHumanReviewer } from "./governance";
import { appendEvolutionMemoryEvent } from "./memory";
import type { CognitiveVersionBundle } from "./types";

export function promoteApprovedCandidate(input: {
  candidateId: string;
  approvedBy: string;
  reason: string;
}): { bundle: CognitiveVersionBundle; previousBundle: CognitiveVersionBundle } {
  assertEvolutionPlatformEnabled();
  assertHumanReviewer(input.approvedBy);

  const candidate = getCandidate(input.candidateId);
  if (!candidate) throw new Error("Candidate not found");
  if (candidate.status !== "APPROVED") {
    throw new Error("Promotion requires APPROVED status");
  }

  const previousBundle = savePrePromotionSnapshot("pre_promotion").bundle;

  const bundle: CognitiveVersionBundle = {
    brainVersion: candidate.version,
    knowledgePackVersion: candidate.knowledgePackVersion,
    graphVersion: candidate.graphVersion,
    reasoningPolicyVersion: candidate.reasoningPolicyVersion,
    actionPolicyVersion: candidate.actionPolicyVersion,
  };

  const graphOk = setActiveGraphVersion(bundle.graphVersion);
  if (!graphOk) {
    throw new Error(`Atomic promotion failed — graph version ${bundle.graphVersion} missing`);
  }

  setActiveKnowledgePackVersionForPromotion(bundle.knowledgePackVersion);
  setActiveBrainVersionForPromotion(candidate.parentVersionId ?? getActiveBrainVersion(), candidate.version);

  setCurrentProductionBundle(bundle);
  updateCandidate(input.candidateId, {
    status: "PROMOTED",
    promotedAt: new Date().toISOString(),
  });

  appendEvolutionMemoryEvent({
    kind: "promoted",
    candidateId: input.candidateId,
    actor: input.approvedBy,
    detail: input.reason,
    metadata: { bundle },
  });

  return { bundle, previousBundle };
}

export function verifyAtomicBundle(bundle: CognitiveVersionBundle): boolean {
  const activeBrain = getActiveBrainVersion();
  return (
    bundle.brainVersion === activeBrain &&
    Boolean(bundle.knowledgePackVersion) &&
    Boolean(bundle.graphVersion)
  );
}
