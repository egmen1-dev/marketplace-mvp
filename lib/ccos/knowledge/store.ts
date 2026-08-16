import type {
  CognitiveEvidence,
  CognitiveHypothesis,
  CognitiveKnowledgeFact,
} from "./types";

export interface KnowledgeStore {
  saveEvidence(evidence: CognitiveEvidence): CognitiveEvidence;
  saveHypothesis(hypothesis: CognitiveHypothesis): CognitiveHypothesis;
  getHypothesis(id: string): CognitiveHypothesis | null;
  listKnowledge(): CognitiveKnowledgeFact[];
}

export class InMemoryKnowledgeStore implements KnowledgeStore {
  private evidence = new Map<string, CognitiveEvidence>();
  private hypotheses = new Map<string, CognitiveHypothesis>();
  private knowledge = new Map<string, CognitiveKnowledgeFact>();

  saveEvidence(evidence: CognitiveEvidence): CognitiveEvidence {
    this.evidence.set(evidence.id, evidence);
    return evidence;
  }

  saveHypothesis(hypothesis: CognitiveHypothesis): CognitiveHypothesis {
    this.hypotheses.set(hypothesis.id, hypothesis);
    return hypothesis;
  }

  getHypothesis(id: string): CognitiveHypothesis | null {
    return this.hypotheses.get(id) ?? null;
  }

  listKnowledge(): CognitiveKnowledgeFact[] {
    return [...this.knowledge.values()];
  }

  /** Wave 0 guard — observations cannot become VERIFIED knowledge directly. */
  tryPromoteObservationToKnowledge(): never {
    throw new Error(
      "Observations cannot become VERIFIED knowledge without Evidence → Hypothesis → Experiment path",
    );
  }
}

let defaultStore: KnowledgeStore = new InMemoryKnowledgeStore();

export function getKnowledgeStore(): KnowledgeStore {
  return defaultStore;
}

export function setKnowledgeStore(store: KnowledgeStore): void {
  defaultStore = store;
}

export function resetKnowledgeStore(): void {
  defaultStore = new InMemoryKnowledgeStore();
}

export { createEvidence } from "./evidence";
export { createHypothesis, proposeHypothesis } from "./hypothesis";
