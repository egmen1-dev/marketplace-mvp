import type {
  KnowledgeAuthor,
  KnowledgeFact,
  KnowledgeStatus,
  KnowledgeTimelineEntry,
} from "./types";
import { currentMarketplaceBrainVersion, KNOWLEDGE_PACK_VERSION } from "./versions";
import { assertKnowledgeSafeForBrain } from "./safety";
import { appendMemoryEvent } from "../memory/store";
import { getKnowledgeRepository } from "./repository";

function timelineEntry(
  event: KnowledgeTimelineEntry["event"],
  reason: string,
  author: KnowledgeAuthor,
  confidence?: number,
  experimentId?: string,
): KnowledgeTimelineEntry {
  return {
    at: new Date().toISOString(),
    event,
    reason,
    author,
    confidence,
    experimentId,
  };
}

export function createCandidateKnowledge(input: {
  title: string;
  description: string;
  confidence: number;
  scope: KnowledgeFact["scope"];
  evidenceIds: string[];
  author: KnowledgeAuthor;
  experimentIds?: string[];
  hypothesisId?: string;
  brainVersion?: string;
}): KnowledgeFact {
  const fact: KnowledgeFact = {
    id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    description: input.description,
    confidence: Math.min(1, Math.max(0, input.confidence)),
    scope: input.scope,
    status: "candidate",
    createdAt: new Date().toISOString(),
    brainVersion: input.brainVersion ?? currentMarketplaceBrainVersion(),
    knowledgeVersion: KNOWLEDGE_PACK_VERSION,
    sources: [
      {
        system: "ccos",
        module: "knowledge-approval",
        version: "approval-v1",
      },
    ],
    evidenceIds: input.evidenceIds,
    experimentIds: input.experimentIds,
    hypothesisId: input.hypothesisId,
    author: input.author,
    timeline: [
      timelineEntry("created", "Candidate knowledge created", input.author, input.confidence),
      timelineEntry("candidate", "Awaiting human verification", input.author, input.confidence),
    ],
  };
  return fact;
}

export function createCandidateFromExperiment(input: {
  experiment: { id: string; scope: KnowledgeFact["scope"]; brainVersion: string };
  title: string;
  description: string;
  evidenceIds: string[];
  confidence: number;
}): KnowledgeFact {
  return createCandidateKnowledge({
    title: input.title,
    description: input.description,
    confidence: input.confidence,
    scope: input.experiment.scope,
    evidenceIds: input.evidenceIds,
    experimentIds: [input.experiment.id],
    brainVersion: input.experiment.brainVersion,
    author: { type: "experiment", id: input.experiment.id },
  });
}

export function approveKnowledge(input: {
  factId: string;
  approver: KnowledgeAuthor;
  reason?: string;
}): KnowledgeFact {
  const repo = getKnowledgeRepository();
  const fact = repo.getFact(input.factId);
  if (!fact) throw new Error(`Knowledge fact not found: ${input.factId}`);
  if (fact.status !== "candidate") {
    throw new Error(`Only candidate knowledge can be approved (current: ${fact.status})`);
  }

  const verified: KnowledgeFact = {
    ...fact,
    status: "verified",
    verifiedAt: new Date().toISOString(),
    confidence: fact.confidence,
    timeline: [
      ...fact.timeline,
      timelineEntry(
        "verified",
        input.reason ?? "Human approval",
        input.approver,
        fact.confidence,
      ),
    ],
  };

  repo.saveFact(verified);
  appendMemoryEvent({
    type: "knowledge_verified",
    entity: { type: "knowledge", id: verified.id },
    summary: verified.title,
    sourceObservationIds: [],
    brainVersion: verified.brainVersion,
  });
  return verified;
}

export function deprecateKnowledge(input: {
  factId: string;
  author: KnowledgeAuthor;
  reason: string;
}): KnowledgeFact {
  const repo = getKnowledgeRepository();
  const fact = repo.getFact(input.factId);
  if (!fact) throw new Error(`Knowledge fact not found: ${input.factId}`);

  const deprecated: KnowledgeFact = {
    ...fact,
    status: "deprecated",
    deprecatedAt: new Date().toISOString(),
    timeline: [
      ...fact.timeline,
      timelineEntry("deprecated", input.reason, input.author, fact.confidence),
    ],
  };
  repo.saveFact(deprecated);
  return deprecated;
}

export function archiveKnowledge(input: {
  factId: string;
  author: KnowledgeAuthor;
  reason: string;
}): KnowledgeFact {
  const repo = getKnowledgeRepository();
  const fact = repo.getFact(input.factId);
  if (!fact) throw new Error(`Knowledge fact not found: ${input.factId}`);

  const archived: KnowledgeFact = {
    ...fact,
    status: "archived",
    archivedAt: new Date().toISOString(),
    timeline: [
      ...fact.timeline,
      timelineEntry("archived", input.reason, input.author, fact.confidence),
    ],
  };
  repo.saveFact(archived);
  return archived;
}

export function assertApprovedForBrainUse(fact: KnowledgeFact): void {
  assertKnowledgeSafeForBrain(fact);
}

export function normalizeLegacyStatus(status: string): KnowledgeStatus {
  const map: Record<string, KnowledgeStatus> = {
    CANDIDATE: "candidate",
    VERIFIED: "verified",
    DEPRECATED: "deprecated",
    candidate: "candidate",
    verified: "verified",
    deprecated: "deprecated",
    archived: "archived",
  };
  return map[status] ?? "candidate";
}
