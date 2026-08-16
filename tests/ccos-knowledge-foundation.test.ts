import { describe, expect, it, beforeEach } from "vitest";

import { createEvidence } from "@/lib/ccos/knowledge/evidence";
import {
  InMemoryKnowledgeStore,
  proposeHypothesis,
  resetKnowledgeStore,
  setKnowledgeStore,
} from "@/lib/ccos/knowledge/store";

describe("ccos knowledge foundation", () => {
  beforeEach(() => {
    resetKnowledgeStore();
    setKnowledgeStore(new InMemoryKnowledgeStore());
  });

  it("stores evidence and proposed hypotheses only", () => {
    const evidence = createEvidence({
      observationIds: ["obs-1"],
      claim: "CTR 1.8% при медиане категории 3.1%",
      confidence: 0.6,
      scope: { category: "socks" },
    });

    const store = new InMemoryKnowledgeStore();
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
    const store = new InMemoryKnowledgeStore();
    expect(() => store.tryPromoteObservationToKnowledge()).toThrow(
      /Evidence → Hypothesis → Experiment/,
    );
  });
});
