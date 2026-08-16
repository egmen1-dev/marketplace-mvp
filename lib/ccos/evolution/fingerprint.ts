import { createHash } from "node:crypto";

import type { ChangeSet, CognitiveBrainVersion } from "./types";

export function computeCandidateFingerprint(input: {
  baseVersion: string;
  changeSet: ChangeSet;
  knowledgePackVersion: string;
  graphVersion: string;
  reasoningPolicyVersion: string;
  actionPolicyVersion: string;
}): string {
  const payload = JSON.stringify({
    base: input.baseVersion,
    changeSet: input.changeSet.entries,
    knowledge: input.knowledgePackVersion,
    graph: input.graphVersion,
    reasoning: input.reasoningPolicyVersion,
    action: input.actionPolicyVersion,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function computeValidationCacheKey(candidate: CognitiveBrainVersion): string {
  return `validation:${candidate.fingerprint}`;
}
