import { describe, expect, it, beforeEach } from "vitest";

import {
  approveKnowledge,
  assertKnowledgeSafeForBrain,
  assertNoLearningToProduction,
  buildEvidenceFromObservations,
  completeExperiment,
  createCandidateKnowledge,
  createEvidence,
  createExperiment,
  getBrainReadableKnowledge,
  getKnowledgeRepository,
  importKnowledgePack,
  exportKnowledgePack,
  listKnowledgeByStatus,
  proposeHypothesis,
  recordSellerFeedback,
  resetExperimentRegistry,
  resetKnowledgeRepository,
  resetSellerFeedback,
  buildKnowledgeSnapshot,
} from "@/lib/ccos/knowledge";
import { buildObservation } from "@/lib/marketplace-cognitive-platform/publishers/_helpers";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import { toMobileBrainResponse } from "@/lib/marketplace-cognitive-platform/brain/mobile-api";
import { marketplaceScope } from "@/lib/ccos/knowledge/scope";

describe("ccos wave 2 knowledge platform", () => {
  beforeEach(() => {
    resetKnowledgeRepository();
    resetExperimentRegistry();
    resetSellerFeedback();
  });

  it("blocks observation → verified knowledge shortcut", () => {
    expect(() => getKnowledgeRepository().tryPromoteObservationToKnowledge()).toThrow(
      /Candidate → Verified/,
    );
  });

  it("candidate knowledge cannot be used by brain until approved", () => {
    const candidate = createCandidateKnowledge({
      title: "Test rule",
      description: "Test",
      confidence: 0.7,
      scope: marketplaceScope("cat-1"),
      evidenceIds: [],
      author: { type: "experiment" },
    });
    getKnowledgeRepository().saveCandidate(candidate);
    expect(() => assertKnowledgeSafeForBrain(candidate)).toThrow(/verified/);
    expect(getBrainReadableKnowledge({ pack: "marketplace", categoryId: "cat-1" })).toHaveLength(0);
  });

  it("approval workflow promotes candidate to verified", () => {
    const evidence = createEvidence({
      observationIds: ["obs-1"],
      claim: "CTR below category median",
      confidence: 0.7,
      scope: marketplaceScope("fans"),
    });
    getKnowledgeRepository().saveEvidence(evidence);

    const candidate = createCandidateKnowledge({
      title: "Hero photo matters",
      description: "Weak hero photo correlates with low CTR",
      confidence: 0.75,
      scope: marketplaceScope("fans", "ventilyatory"),
      evidenceIds: [evidence.id],
      author: { type: "experiment" },
    });
    getKnowledgeRepository().saveCandidate(candidate);

    const verified = approveKnowledge({
      factId: candidate.id,
      approver: { type: "human", label: "admin" },
    });
    expect(verified.status).toBe("verified");
    expect(getBrainReadableKnowledge({ pack: "marketplace", categoryId: "fans" })).toHaveLength(1);
  });

  it("experiment completion creates candidate knowledge", () => {
    const experiment = createExperiment({
      title: "Photo +1 lab",
      goal: "Measure CTR lift from extra photo",
      dataset: "ranking-lab-1000",
      metrics: ["ctr", "position"],
      scope: marketplaceScope("fans"),
      brainVersion: "marketplace-brain-v2-knowledge",
    });

    const evidence = createEvidence({
      observationIds: [],
      claim: "Lab showed moderate position lift",
      confidence: 0.65,
    });
    getKnowledgeRepository().saveEvidence(evidence);

    const { candidate, experiment: completed } = completeExperiment({
      experimentId: experiment.id,
      result: { positionDelta: 2 },
      verdict: "positive",
      knowledgeTitle: "Extra photo helps visibility",
      knowledgeDescription: "Ranking lab sensitivity: +1 photo improved position",
      evidenceIds: [evidence.id],
      confidence: 0.68,
    });

    expect(completed.status).toBe("completed");
    expect(candidate.status).toBe("candidate");
    expect(listKnowledgeByStatus("candidate")).toHaveLength(1);
  });

  it("builds evidence from observations for brain recommendations", () => {
    const obs = buildObservation({
      entityType: "product",
      entityId: "p1",
      metric: OBSERVATION_METRICS.behaviour.ctr,
      domain: "behaviour",
      value: 0.018,
      confidence: 0.8,
      evidence: ["CTR 1.8%"],
      sourceModule: "fixture",
      sourceVersion: "v1",
    });
    const evidence = buildEvidenceFromObservations({ observations: [obs] });
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence[0]?.claim).toContain("CTR");
  });

  it("seller feedback becomes evidence", () => {
    const record = recordSellerFeedback({
      productId: "p1",
      recommendationId: "replace-hero-photo",
      recommendationTitle: "Замените главное фото",
      outcome: "helped",
    });
    expect(record.evidenceId).toBeTruthy();
  });

  it("category knowledge does not leak across scopes", () => {
    const repo = getKnowledgeRepository();
    repo.saveFact({
      id: "kf_fans",
      title: "Fans rule",
      description: "Fans only",
      confidence: 0.8,
      scope: marketplaceScope("cat-fans", "ventilyatory"),
      status: "verified",
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      brainVersion: "marketplace-brain-v2-knowledge",
      knowledgeVersion: "knowledge-pack-v2",
      sources: [],
      evidenceIds: [],
      author: { type: "human" },
      timeline: [],
    });
    repo.saveFact({
      id: "kf_vacuum",
      title: "Vacuum rule",
      description: "Vacuum only",
      confidence: 0.8,
      scope: marketplaceScope("cat-vacuum", "pylesosy"),
      status: "verified",
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      brainVersion: "marketplace-brain-v2-knowledge",
      knowledgeVersion: "knowledge-pack-v2",
      sources: [],
      evidenceIds: [],
      author: { type: "human" },
      timeline: [],
    });

    expect(getBrainReadableKnowledge({ pack: "marketplace", categoryId: "cat-fans" })).toHaveLength(1);
    expect(getBrainReadableKnowledge({ pack: "marketplace", categoryId: "cat-vacuum" })).toHaveLength(1);
  });

  it("blocks learning → production shortcut", () => {
    expect(() => assertNoLearningToProduction("ranking_weight_change")).toThrow(/Learning → Production/);
  });

  it("exports knowledge packs and offline snapshot", () => {
    const repo = getKnowledgeRepository();
    repo.saveFact({
      id: "kf_pack",
      title: "Pack fact",
      description: "Verified pack export",
      confidence: 0.9,
      scope: marketplaceScope(),
      status: "verified",
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      brainVersion: "marketplace-brain-v2-knowledge",
      knowledgeVersion: "knowledge-pack-v2",
      sources: [],
      evidenceIds: [],
      author: { type: "human" },
      timeline: [],
    });

    const pack = exportKnowledgePack("marketplace");
    expect(pack.facts).toHaveLength(1);
    importKnowledgePack(pack, "merge");

    const snapshot = buildKnowledgeSnapshot(["marketplace"]);
    expect(snapshot.verifiedFactIds.length).toBeGreaterThan(0);
  });

  it("mobile brain response is compact without debug fields", () => {
    const mobile = toMobileBrainResponse({
      productId: "p1",
      context: {
        id: "ctx",
        contextVersion: "v1",
        confidence: { overall: 0.7 },
        fingerprint: "fp",
        createdAt: new Date().toISOString(),
      },
      observations: [],
      signals: [],
      genome: {
        base: { overall: 72, dimensions: {}, confidence: 0.7, genomeVersion: "v0" },
        contextual: { overall: 68, dimensions: {}, confidence: 0.6, contextId: "ctx" },
        genomeVersion: "v1",
      },
      strengths: [],
      weaknesses: [],
      blockers: [],
      nextBestAction: {
        title: "Замените главное фото",
        why: "CTR ниже медианы",
        expectedImpact: "Лучше CTR",
        effort: "low",
        score: 1,
        ctaLabel: "Редактировать",
      },
      actionCandidates: [],
      simulations: [],
      explanation: [],
      summary: { now: "", why: "", nextStep: null, predictionHint: null, contextLabel: null },
      decision: { allowed: true, blockedCapabilities: [], reasons: [], sourceSystems: [] },
      confidence: 0.7,
      maturity: "L2_ADVISOR",
      brainVersion: "marketplace-brain-v2-knowledge",
      advisoryOnly: true,
      publisherHealth: [],
      provenance: [],
      knowledgeFactIds: [],
      recommendationEvidence: [{ claim: "CTR 1.8% vs median 3%", confidence: 0.8 }],
      reasoningPackVersion: "reasoning-pack-v2",
      knowledgePackVersion: "knowledge-pack-v1",
    });

    expect(mobile.topAction?.title).toBeTruthy();
    expect(mobile.evidenceSummary.length).toBeGreaterThan(0);
    expect(mobile.advisoryOnly).toBe(true);
    expect(JSON.stringify(mobile).includes("publisherHealth")).toBe(false);
  });

  it("stores evidence and proposed hypotheses only in foundation flow", () => {
    const evidence = createEvidence({
      observationIds: ["obs-1"],
      claim: "CTR 1.8% при медиане категории 3.1%",
      confidence: 0.6,
      scope: marketplaceScope("socks"),
    });
    getKnowledgeRepository().saveEvidence(evidence);
    const hypothesis = proposeHypothesis({
      claim: "Улучшение фото повысит CTR",
      evidenceIds: [evidence.id],
      proposedBy: "brain",
      confidence: 0.55,
    });
    getKnowledgeRepository().saveHypothesis(hypothesis);
    expect(getKnowledgeRepository().getHypothesis(hypothesis.id)?.status).toBe("PROPOSED");
    expect(getKnowledgeRepository().listKnowledge()).toHaveLength(0);
  });
});
