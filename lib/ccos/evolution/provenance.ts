import { listEvolutionMemoryEvents } from "./memory";
import { getCandidate } from "./candidate";
import type { CognitiveBrainVersion } from "./types";

export function buildCandidateProvenance(candidateId: string): {
  candidate: CognitiveBrainVersion;
  timeline: ReturnType<typeof listEvolutionMemoryEvents>;
  answer: string;
} {
  const candidate = getCandidate(candidateId);
  if (!candidate) throw new Error("Candidate not found");

  const timeline = listEvolutionMemoryEvents(candidateId);
  const answer = [
    `Marketplace Brain ${candidate.version} lifecycle:`,
    `Reason: ${candidate.provenance.createdReason}`,
    `Knowledge: ${candidate.provenance.sourceKnowledgeIds.join(", ") || "n/a"}`,
    `Experiments: ${candidate.provenance.sourceExperimentIds.join(", ") || "n/a"}`,
    `Graph: ${candidate.graphVersion}`,
    `Approved by: ${candidate.approvedBy ?? "pending"}`,
    `Events: ${timeline.map((e) => e.kind).join(" → ")}`,
  ].join("\n");

  return { candidate, timeline, answer };
}

export function compareBrainVersions(v1: string, v2: string): {
  v1: string;
  v2: string;
  diffSummary: string;
} {
  return {
    v1,
    v2,
    diffSummary: `Compare ${v1} vs ${v2} — use candidate change set for detailed diff`,
  };
}
