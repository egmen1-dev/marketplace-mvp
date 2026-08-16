import type {
  CognitiveHypothesis,
  KnowledgeEvidence,
  KnowledgeFact,
  KnowledgePackId,
  KnowledgeScope,
  KnowledgeStatus,
} from "./types";
import { filterBrainUsableFacts } from "./safety";
import { scopesMatch } from "./scope";

export interface KnowledgeRepository {
  saveEvidence(evidence: KnowledgeEvidence): KnowledgeEvidence;
  getEvidence(id: string): KnowledgeEvidence | null;
  listEvidence(): KnowledgeEvidence[];

  saveHypothesis(hypothesis: CognitiveHypothesis): CognitiveHypothesis;
  getHypothesis(id: string): CognitiveHypothesis | null;
  listHypotheses(): CognitiveHypothesis[];

  saveCandidate(fact: KnowledgeFact): KnowledgeFact;
  saveFact(fact: KnowledgeFact): KnowledgeFact;
  getFact(id: string): KnowledgeFact | null;
  listFacts(filter?: { status?: KnowledgeStatus; pack?: KnowledgePackId }): KnowledgeFact[];
  listKnowledge(): KnowledgeFact[];
  listVerifiedFacts(pack?: KnowledgePackId): KnowledgeFact[];

  searchKnowledge(query: string, pack?: KnowledgePackId): KnowledgeFact[];
  getKnowledgeByScope(context: {
    pack: KnowledgePackId;
    categoryId?: string;
    categorySlug?: string;
    season?: string;
    device?: string;
  }): KnowledgeFact[];

  /** Wave 0 guard — observations cannot become VERIFIED knowledge directly. */
  tryPromoteObservationToKnowledge(): never;
}

export class InMemoryKnowledgeRepository implements KnowledgeRepository {
  private evidence = new Map<string, KnowledgeEvidence>();
  private hypotheses = new Map<string, CognitiveHypothesis>();
  private facts = new Map<string, KnowledgeFact>();

  saveEvidence(evidence: KnowledgeEvidence): KnowledgeEvidence {
    this.evidence.set(evidence.id, evidence);
    return evidence;
  }

  getEvidence(id: string): KnowledgeEvidence | null {
    return this.evidence.get(id) ?? null;
  }

  listEvidence(): KnowledgeEvidence[] {
    return [...this.evidence.values()];
  }

  saveHypothesis(hypothesis: CognitiveHypothesis): CognitiveHypothesis {
    this.hypotheses.set(hypothesis.id, hypothesis);
    return hypothesis;
  }

  getHypothesis(id: string): CognitiveHypothesis | null {
    return this.hypotheses.get(id) ?? null;
  }

  listHypotheses(): CognitiveHypothesis[] {
    return [...this.hypotheses.values()];
  }

  saveCandidate(fact: KnowledgeFact): KnowledgeFact {
    if (fact.status !== "candidate") {
      throw new Error("saveCandidate expects status=candidate");
    }
    this.facts.set(fact.id, fact);
    return fact;
  }

  saveFact(fact: KnowledgeFact): KnowledgeFact {
    this.facts.set(fact.id, fact);
    return fact;
  }

  getFact(id: string): KnowledgeFact | null {
    return this.facts.get(id) ?? null;
  }

  listFacts(filter?: { status?: KnowledgeStatus; pack?: KnowledgePackId }): KnowledgeFact[] {
    return [...this.facts.values()].filter((f) => {
      if (filter?.status && f.status !== filter.status) return false;
      if (filter?.pack && f.scope.pack !== filter.pack) return false;
      return true;
    });
  }

  listKnowledge(): KnowledgeFact[] {
    return this.listFacts();
  }

  listVerifiedFacts(pack?: KnowledgePackId): KnowledgeFact[] {
    return filterBrainUsableFacts(this.listFacts({ status: "verified", pack }));
  }

  searchKnowledge(query: string, pack?: KnowledgePackId): KnowledgeFact[] {
    const q = query.toLowerCase();
    return this.listFacts({ pack }).filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q),
    );
  }

  getKnowledgeByScope(context: {
    pack: KnowledgePackId;
    categoryId?: string;
    categorySlug?: string;
    season?: string;
    device?: string;
  }): KnowledgeFact[] {
    return filterBrainUsableFacts(this.listFacts({ status: "verified", pack: context.pack })).filter(
      (f) => scopesMatch(f.scope, context),
    );
  }

  tryPromoteObservationToKnowledge(): never {
    throw new Error(
      "Observations cannot become VERIFIED knowledge without Evidence → Hypothesis → Experiment → Candidate → Verified path",
    );
  }
}

let defaultRepo: KnowledgeRepository = new InMemoryKnowledgeRepository();

export function getKnowledgeRepository(): KnowledgeRepository {
  return defaultRepo;
}

export function setKnowledgeRepository(repo: KnowledgeRepository): void {
  defaultRepo = repo;
}

export function resetKnowledgeRepository(): void {
  defaultRepo = new InMemoryKnowledgeRepository();
}

/** @deprecated use getKnowledgeRepository */
export const getKnowledgeStore = getKnowledgeRepository;

/** @deprecated use setKnowledgeRepository */
export const setKnowledgeStore = setKnowledgeRepository;

/** @deprecated use resetKnowledgeRepository */
export const resetKnowledgeStore = resetKnowledgeRepository;

/** @deprecated use InMemoryKnowledgeRepository */
export type KnowledgeStore = KnowledgeRepository;
export const InMemoryKnowledgeStore = InMemoryKnowledgeRepository;
