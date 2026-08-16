import { describe, expect, it, beforeEach } from "vitest";

import {
  approveCandidate,
  createBrainCandidate,
  executeEvolutionRollback,
  isCandidateVisibleToSeller,
  listCandidates,
  promoteApprovedCandidate,
  resetApprovalStore,
  resetEvolutionMemory,
  resetEvolutionRegistry,
  resetMonitoring,
  resetShadowResults,
  resetValidationCache,
  runCandidateValidationPipeline,
  getCandidate,
} from "@/lib/ccos/evolution";
import { applyWeightChange } from "@/lib/ccos/evolution/change-set";
import { bootstrapVerifiedVersions } from "@/lib/ccos/rollback";
import {
  getActiveBrainVersion,
  resetBrainRollbackState,
  setActiveBrainVersionForPromotion,
} from "@/lib/ccos/rollback/brain";

describe("CCOS Wave 6 Evolution Engine", () => {
  beforeEach(() => {
    process.env.CCOS_EVOLUTION_PLATFORM_ENABLED = "true";
    process.env.CCOS_ENABLED = "true";
    process.env.CCOS_GRAPH_PLATFORM_ENABLED = "true";
    process.env.CCOS_TWIN_PLATFORM_ENABLED = "true";
    process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED = "true";
    bootstrapVerifiedVersions();
    resetEvolutionRegistry();
    resetApprovalStore();
    resetEvolutionMemory();
    resetShadowResults();
    resetValidationCache();
    resetMonitoring();
    resetBrainRollbackState();
    setActiveBrainVersionForPromotion("", "marketplace-brain-v5-twin");
  });

  it("creates candidate with change set (no opaque candidate)", () => {
    const weights = { quality: 0.28, relevance: 0.24, promotion: 0.08, thumbnail: 0.14, trust: 0.18, coldStart: 0.04, newSeller: 0.04 };
    const candidate = createBrainCandidate({
      baseVersion: "marketplace-brain-v5-twin",
      changeSetEntries: [applyWeightChange(weights, "thumbnail", 0.17)],
      reason: "3 verified experiments",
      createdBy: "admin@test.com",
      evidence: { knowledgeIds: ["K-382", "K-411"] },
      candidateVersionLabel: "marketplace-brain-v6-candidate-good",
    });
    expect(candidate.status).toBe("CANDIDATE");
    expect(candidate.changeSet.entries.length).toBeGreaterThan(0);
    expect(isCandidateVisibleToSeller(candidate)).toBe(false);
  });

  it("passes validation for reasonable improvement candidate", () => {
    const weights = { quality: 0.28, relevance: 0.24, promotion: 0.08, thumbnail: 0.17, trust: 0.18, coldStart: 0.04, newSeller: 0.04 };
    const candidate = createBrainCandidate({
      baseVersion: "marketplace-brain-v5-twin",
      changeSetEntries: [applyWeightChange(weights, "thumbnail", 0.17)],
      reason: "improve thumbnail signal",
      createdBy: "admin@test.com",
      policyWeights: weights,
      candidateVersionLabel: "marketplace-brain-v6-good",
    });
    const validation = runCandidateValidationPipeline(candidate.id);
    expect(validation.passed).toBe(true);
    expect(getCandidate(candidate.id)?.riskTier).not.toBe("CRITICAL");
  });

  it("rejects bad candidate with high promotion weight", () => {
    const weights = { quality: 0.02, relevance: 0.1, promotion: 0.55, thumbnail: 0.1, trust: 0.05, coldStart: 0.04, newSeller: 0.04 };
    const candidate = createBrainCandidate({
      baseVersion: "marketplace-brain-v5-twin",
      changeSetEntries: [
        applyWeightChange(weights, "promotion", 0.55),
        applyWeightChange(weights, "quality", 0.02),
      ],
      reason: "bad idea",
      createdBy: "admin@test.com",
      policyWeights: weights,
      candidateVersionLabel: "marketplace-brain-v6-bad",
    });
    const validation = runCandidateValidationPipeline(candidate.id);
    expect(validation.passed).toBe(false);
    expect(getCandidate(candidate.id)?.status).toBe("REJECTED");
  });

  it("blocks dirty socks regression", () => {
    const weights = { quality: 0.05, relevance: 0.05, promotion: 0.5, thumbnail: 0.2, trust: 0.05, coldStart: 0.05, newSeller: 0.1 };
    const candidate = createBrainCandidate({
      baseVersion: "marketplace-brain-v5-twin",
      changeSetEntries: [applyWeightChange(weights, "promotion", 0.5)],
      reason: "junk promotion",
      createdBy: "admin@test.com",
      policyWeights: weights,
    });
    const regression = runCandidateValidationPipeline(candidate.id);
    expect(regression.passed).toBe(false);
  });

  it("detects shadow critical disagreement when quality blocker removed", () => {
    const weights = { quality: 0.01, relevance: 0.05, promotion: 0.6, thumbnail: 0.2, trust: 0.04, coldStart: 0.05, newSeller: 0.05 };
    const candidate = createBrainCandidate({
      baseVersion: "marketplace-brain-v5-twin",
      changeSetEntries: [applyWeightChange(weights, "promotion", 0.6)],
      reason: "promote junk",
      createdBy: "admin@test.com",
      policyWeights: weights,
    });
    const validation = runCandidateValidationPipeline(candidate.id);
    const shadowStage = validation.stages.find((s) => s.stage === "SHADOW_VALIDATION");
    expect(shadowStage?.passed).toBe(false);
  });

  it("denies promotion without human approval", () => {
    const weights = { quality: 0.28, relevance: 0.24, promotion: 0.08, thumbnail: 0.17, trust: 0.18, coldStart: 0.04, newSeller: 0.04 };
    const candidate = createBrainCandidate({
      baseVersion: "marketplace-brain-v5-twin",
      changeSetEntries: [applyWeightChange(weights, "thumbnail", 0.17)],
      reason: "good",
      createdBy: "admin@test.com",
      policyWeights: weights,
      candidateVersionLabel: "marketplace-brain-v6-unapproved",
    });
    runCandidateValidationPipeline(candidate.id);
    expect(() =>
      promoteApprovedCandidate({ candidateId: candidate.id, approvedBy: "human-admin", reason: "skip approval" }),
    ).toThrow(/APPROVED/);
  });

  it("runs full promote and rollback lifecycle preserving history", () => {
    const base = "marketplace-brain-v5-twin";
    const weights = { quality: 0.28, relevance: 0.24, promotion: 0.08, thumbnail: 0.17, trust: 0.18, coldStart: 0.04, newSeller: 0.04 };
    const candidate = createBrainCandidate({
      baseVersion: base,
      changeSetEntries: [applyWeightChange(weights, "thumbnail", 0.17)],
      reason: "validated improvement",
      createdBy: "admin@test.com",
      policyWeights: weights,
      candidateVersionLabel: "marketplace-brain-v6-promoted",
    });

    const currentDuringValidation = getActiveBrainVersion();
    runCandidateValidationPipeline(candidate.id);
    expect(getActiveBrainVersion()).toBe(currentDuringValidation);

    approveCandidate({ candidateId: candidate.id, reviewedBy: "human-admin@test.com" });
    const { bundle, previousBundle } = promoteApprovedCandidate({
      candidateId: candidate.id,
      approvedBy: "human-admin@test.com",
      reason: "controlled promotion",
    });

    expect(bundle.brainVersion).toBe("marketplace-brain-v6-promoted");
    expect(getActiveBrainVersion()).toBe("marketplace-brain-v6-promoted");
    expect(previousBundle.brainVersion).toBe(base);

    executeEvolutionRollback({
      fromVersion: "marketplace-brain-v6-promoted",
      toVersion: base,
      approvedBy: "human-admin@test.com",
      requestedBy: "human-admin@test.com",
      reason: "monitoring regression",
      candidateId: candidate.id,
    });

    expect(getActiveBrainVersion()).toBe(base);
    expect(getCandidate(candidate.id)?.status).toBe("ROLLED_BACK");
    expect(listCandidates().some((c) => c.id === candidate.id)).toBe(true);
  });

  it("rejects AI as reviewer", () => {
    const weights = { quality: 0.28, relevance: 0.24, promotion: 0.08, thumbnail: 0.17, trust: 0.18, coldStart: 0.04, newSeller: 0.04 };
    const candidate = createBrainCandidate({
      baseVersion: "marketplace-brain-v5-twin",
      changeSetEntries: [applyWeightChange(weights, "thumbnail", 0.17)],
      reason: "good",
      createdBy: "admin@test.com",
      policyWeights: weights,
    });
    runCandidateValidationPipeline(candidate.id);
    expect(() => approveCandidate({ candidateId: candidate.id, reviewedBy: "ai" })).toThrow();
  });
});
