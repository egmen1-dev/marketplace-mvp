import { describe, expect, it, beforeEach } from "vitest";

import {
  bootstrapVerifiedVersions,
  performGraphRollback,
  resetVerifiedVersionRegistry,
  resetRollbackAuditLog,
} from "@/lib/ccos/rollback";
import { RollbackGovernanceError } from "@/lib/ccos/rollback/governance";
import { resetGraphVersions } from "@/lib/ccos/graph/versioning";
import { resolveRollbackVersionPointers } from "@/lib/ccos/rollback";

describe("ccos rollback governance", () => {
  beforeEach(() => {
    resetGraphVersions();
    resetVerifiedVersionRegistry();
    resetRollbackAuditLog();
    bootstrapVerifiedVersions();
  });

  it("rejects automatic/system rollback", () => {
    const { graph } = resolveRollbackVersionPointers();
    expect(() =>
      performGraphRollback({
        artifactType: "graph_version",
        fromVersion: graph.current,
        toVersion: graph.previous!,
        reason: "auto",
        requestedBy: "system",
        approvedBy: "admin@test",
      }),
    ).toThrow(RollbackGovernanceError);
  });

  it("requires approvedBy for human rollback", () => {
    const { graph } = resolveRollbackVersionPointers();
    expect(() =>
      performGraphRollback({
        artifactType: "graph_version",
        fromVersion: graph.current,
        toVersion: graph.previous!,
        reason: "test",
        requestedBy: "ops@test",
        approvedBy: "",
      }),
    ).toThrow(RollbackGovernanceError);
  });
});
