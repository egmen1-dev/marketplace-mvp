import type { CognitiveHypothesis } from "./types";
import { trackCcosEvent } from "../telemetry";

export function createHypothesis(input: {
  title: string;
  claim: string;
  evidenceIds: string[];
  confidence: number;
  proposedBy: CognitiveHypothesis["proposedBy"];
}): CognitiveHypothesis {
  return {
    id: `hyp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    claim: input.claim,
    evidenceIds: input.evidenceIds,
    confidence: Math.min(1, Math.max(0, input.confidence)),
    status: "PROPOSED",
    proposedBy: input.proposedBy,
    createdAt: new Date().toISOString(),
  };
}

export function proposeHypothesis(input: {
  claim: string;
  evidenceIds: string[];
  proposedBy: CognitiveHypothesis["proposedBy"];
  confidence: number;
  title?: string;
}): CognitiveHypothesis {
  trackCcosEvent("ccos_hypothesis_proposed");
  return createHypothesis({
    title: input.title ?? input.claim.slice(0, 80),
    claim: input.claim,
    evidenceIds: input.evidenceIds,
    confidence: input.confidence,
    proposedBy: input.proposedBy,
  });
}
