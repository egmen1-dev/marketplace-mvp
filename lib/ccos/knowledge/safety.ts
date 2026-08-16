import type { KnowledgeFact, KnowledgeStatus } from "./types";

export function assertKnowledgeSafeForBrain(fact: Pick<KnowledgeFact, "status">): void {
  if (fact.status !== "verified") {
    throw new Error(
      `Knowledge status "${fact.status}" cannot be used by Brain — only verified knowledge allowed`,
    );
  }
}

export function assertNoLearningToProduction(action: string): never {
  throw new Error(
    `Learning → Production path blocked for "${action}". Use Candidate → Experiment → Verified → Production`,
  );
}

export function assertObservationNotKnowledge(): never {
  throw new Error(
    "Observation → Knowledge shortcut forbidden. Required path: Observation → Evidence → Hypothesis → Experiment → Candidate → Verified",
  );
}

export function filterBrainUsableFacts(facts: KnowledgeFact[]): KnowledgeFact[] {
  return facts.filter((f) => f.status === "verified");
}

export function isBrainUsableStatus(status: KnowledgeStatus): boolean {
  return status === "verified";
}
