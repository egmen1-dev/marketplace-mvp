import type { CognitiveApproval, CognitiveApprovalStatus, CognitiveArtifactType } from "./contracts";
import { assertHumanReviewer } from "./governance";
import { appendEvolutionMemoryEvent } from "./memory";
import { getCandidate, updateCandidate } from "./candidate";
import { canApproveWithRiskTier } from "./risk";

const approvals = new Map<string, CognitiveApproval>();

export function requestCognitiveApproval(input: {
  artifactType: CognitiveArtifactType;
  artifactId: string;
  requestedBy: string;
  reason?: string;
}): CognitiveApproval {
  const approval: CognitiveApproval = {
    id: `approval-${approvals.size + 1}`,
    artifactType: input.artifactType,
    artifactId: input.artifactId,
    status: "PENDING",
    requestedBy: input.requestedBy,
    reason: input.reason,
  };
  approvals.set(approval.id, approval);
  appendEvolutionMemoryEvent({
    kind: "approval_requested",
    candidateId: input.artifactId,
    actor: input.requestedBy,
    detail: `Approval requested for ${input.artifactType}:${input.artifactId}`,
  });
  return approval;
}

export function approveCandidate(input: {
  candidateId: string;
  reviewedBy: string;
  reason?: string;
}): { approval: CognitiveApproval; candidateId: string } {
  assertHumanReviewer(input.reviewedBy);
  const candidate = getCandidate(input.candidateId);
  if (!candidate) throw new Error("Candidate not found");
  if (candidate.status !== "VALIDATING" && candidate.status !== "CANDIDATE") {
    throw new Error(`Cannot approve candidate in status ${candidate.status}`);
  }
  if (candidate.riskTier && !canApproveWithRiskTier(candidate.riskTier)) {
    throw new Error("CRITICAL risk tier requires elevated governance — cannot approve normally");
  }
  if (!candidate.validationResults?.passed) {
    throw new Error("Candidate must pass validation before approval");
  }

  const approval =
    [...approvals.values()].find((a) => a.artifactId === input.candidateId && a.status === "PENDING") ??
    requestCognitiveApproval({
      artifactType: "brain_version",
      artifactId: input.candidateId,
      requestedBy: input.reviewedBy,
    });

  approval.status = "APPROVED";
  approval.reviewedBy = input.reviewedBy;
  approval.reviewedAt = new Date().toISOString();
  approval.reason = input.reason ?? approval.reason;
  approvals.set(approval.id, approval);

  updateCandidate(input.candidateId, {
    status: "APPROVED",
    approvedBy: input.reviewedBy,
    approvedAt: approval.reviewedAt,
  });

  appendEvolutionMemoryEvent({
    kind: "approved",
    candidateId: input.candidateId,
    actor: input.reviewedBy,
    detail: input.reason ?? "approved",
  });

  return { approval, candidateId: input.candidateId };
}

export function rejectCandidate(input: {
  candidateId: string;
  reviewedBy: string;
  reason: string;
}): CognitiveApproval {
  assertHumanReviewer(input.reviewedBy);
  if (!input.reason.trim()) throw new Error("Reject requires reason");

  const approval =
    [...approvals.values()].find((a) => a.artifactId === input.candidateId) ??
    requestCognitiveApproval({
      artifactType: "brain_version",
      artifactId: input.candidateId,
      requestedBy: input.reviewedBy,
    });

  approval.status = "REJECTED";
  approval.reviewedBy = input.reviewedBy;
  approval.reviewedAt = new Date().toISOString();
  approval.reason = input.reason;
  approvals.set(approval.id, approval);

  updateCandidate(input.candidateId, {
    status: "REJECTED",
    rejectedBy: input.reviewedBy,
    rejectedAt: approval.reviewedAt,
    rejectReason: input.reason,
  });

  appendEvolutionMemoryEvent({
    kind: "rejected",
    candidateId: input.candidateId,
    actor: input.reviewedBy,
    detail: input.reason,
  });

  return approval;
}

export function getApproval(id: string): CognitiveApproval | null {
  return approvals.get(id) ?? null;
}

export function listApprovals(): CognitiveApproval[] {
  return [...approvals.values()];
}

export function resetApprovalStore(): void {
  approvals.clear();
}

export type { CognitiveApproval, CognitiveApprovalStatus };
