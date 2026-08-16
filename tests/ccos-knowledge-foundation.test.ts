import { describe, expect, it, beforeEach } from "vitest";

import { createEvidence } from "@/lib/ccos/knowledge/evidence";
import { proposeHypothesis } from "@/lib/ccos/knowledge/hypothesis";
import {
  InMemoryKnowledgeRepository,
  resetKnowledgeRepository,
  setKnowledgeRepository,
} from "@/lib/ccos/knowledge/repository";

describe("ccos knowledge foundation", () => {
  beforeEach(() => {
    resetKnowledgeRepository();
    setKnowledgeRepository(new InMemoryKnowledgeRepository());
  });

  it("stores evidence and proposed hypotheses only", () => {
    const evidence = createEvidence({
      observationIds: ["obs-1"],
      claim: "CTR 1.8% при медиане категории 3.1%",
      confidence: 0.6,
      scope: { pack: "marketplace", categories: ["socks"] },
    });

    const store = new InMemoryKnowledgeRepository();
    store.saveEvidence(evidence);

    const hypothesis = proposeHypothesis({
      claim: "Улучшение фото повысит CTR",
      evidenceIds: [evidence.id],
      proposedBy: "brain",
      confidence: 0.55,
    });
    store.saveHypothesis(hypothesis);

    expect(store.getHypothesis(hypothesis.id)?.status).toBe("PROPOSED");
    expect(store.listKnowledge()).toHaveLength(0);
  });

  it("blocks observation → verified knowledge shortcut", () => {
    const store = new InMemoryKnowledgeRepository();
    expect(() => store.tryPromoteObservationToKnowledge()).toThrow(
      /Evidence → Hypothesis → Experiment/,
    );
  });
});
