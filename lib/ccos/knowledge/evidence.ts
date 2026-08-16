import type { KnowledgeAuthor, KnowledgeEvidence, KnowledgeScope } from "./types";

export function createEvidence(input: {
  observationIds: string[];
  claim: string;
  confidence: number;
  scope?: Partial<KnowledgeScope>;
  author?: KnowledgeAuthor;
  sources?: KnowledgeEvidence["sources"];
}): KnowledgeEvidence {
  return {
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    observationIds: input.observationIds,
    claim: input.claim,
    confidence: Math.min(1, Math.max(0, input.confidence)),
    scope: {
      pack: "marketplace",
      ...input.scope,
    },
    sources: input.sources ?? [
      { system: "ccos", module: "evidence-engine", version: "v1" },
    ],
    author: input.author ?? { type: "brain", label: "manual" },
    createdAt: new Date().toISOString(),
  };
}
