import type { RollbackRequestInput } from "./types";

export class RollbackGovernanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RollbackGovernanceError";
  }
}

/** Automatic rollback is forbidden in PRE-WAVE-6 final gate. */
export function assertHumanApprovedRollback(input: RollbackRequestInput): void {
  if (!input.requestedBy?.trim()) {
    throw new RollbackGovernanceError("Rollback requires requestedBy");
  }
  if (!input.approvedBy?.trim()) {
    throw new RollbackGovernanceError("Rollback requires approvedBy — no automatic rollback");
  }
  if (input.requestedBy === "system" || input.approvedBy === "system") {
    throw new RollbackGovernanceError("Automatic/system rollback is forbidden");
  }
  if (!input.reason?.trim()) {
    throw new RollbackGovernanceError("Rollback requires reason");
  }
}
