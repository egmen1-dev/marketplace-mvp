import type { CognitiveEvidence } from "./types";

export function createEvidence(input: {
  observationIds: string[];
  claim: string;
  confidence: number;
  scope?: Record<string, unknown>;
}): CognitiveEvidence {
  return {
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    observationIds: input.observationIds,
    claim: input.claim,
    confidence: Math.min(1, Math.max(0, input.confidence)),
    scope: input.scope ?? {},
    createdAt: new Date().toISOString(),
  };
}
