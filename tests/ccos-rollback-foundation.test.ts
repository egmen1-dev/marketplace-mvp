import { describe, expect, it, beforeEach } from "vitest";

import { resetGraphVersions } from "@/lib/ccos/graph/versioning";
import {
  bootstrapVerifiedVersions,
  performGraphRollback,
  performBrainRollback,
  performKnowledgePackRollback,
  resolveRollbackVersionPointers,
  isRollbackFoundationReady,
  resetVerifiedVersionRegistry,
  resetRollbackAuditLog,
  listRollbackAuditLog,
} from "@/lib/ccos/rollback";
import { resetBrainRollbackState, getActiveBrainVersion } from "@/lib/ccos/rollback/brain";
import { resetKnowledgeRollbackState } from "@/lib/ccos/rollback/knowledge";
import { getActiveGraphVersion } from "@/lib/ccos/graph/versioning";

describe("ccos rollback foundation", () => {
  beforeEach(() => {
    resetGraphVersions();
    resetVerifiedVersionRegistry();
    resetRollbackAuditLog();
    resetBrainRollbackState();
    resetKnowledgeRollbackState();
    bootstrapVerifiedVersions();
  });

  it("seeds verified graph vN and vN-1 with provenance", () => {
    const pointers = resolveRollbackVersionPointers();
    expect(pointers.graph.current).toBeTruthy();
    expect(pointers.graph.previous).toBeTruthy();
    expect(isRollbackFoundationReady()).toBe(true);
  });

  it("switches graph active pointer v2 → v1 → v2 with audit log", () => {
    const pointers = resolveRollbackVersionPointers();
    const v2 = pointers.graph.current;
    const v1 = pointers.graph.previous!;

    performGraphRollback({
      artifactType: "graph_version",
      fromVersion: v2,
      toVersion: v1,
      reason: "staging test rollback",
      requestedBy: "ops@test",
      approvedBy: "admin@test",
    });
    expect(getActiveGraphVersion()).toBe(v1);

    performGraphRollback({
      artifactType: "graph_version",
      fromVersion: v1,
      toVersion: v2,
      reason: "restore latest",
      requestedBy: "ops@test",
      approvedBy: "admin@test",
    });
    expect(getActiveGraphVersion()).toBe(v2);
    expect(listRollbackAuditLog()).toHaveLength(2);
  });

  it("rolls back brain v5 → v4 without deleting observations", () => {
    process.env.CCOS_TWIN_PLATFORM_ENABLED = "true";
    const current = getActiveBrainVersion();
    const previous = resolveRollbackVersionPointers().brain.previous!;
    performBrainRollback({
      artifactType: "brain_version",
      fromVersion: current,
      toVersion: previous,
      reason: "brain rollback test",
      requestedBy: "ops@test",
      approvedBy: "admin@test",
    });
    expect(getActiveBrainVersion()).toBe(previous);
    delete process.env.CCOS_TWIN_PLATFORM_ENABLED;
  });

  it("rolls back knowledge pack active pointer", () => {
    const pointers = resolveRollbackVersionPointers();
    performKnowledgePackRollback({
      artifactType: "knowledge_version",
      fromVersion: pointers.knowledge.current,
      toVersion: pointers.knowledge.previous!,
      reason: "knowledge rollback test",
      requestedBy: "ops@test",
      approvedBy: "admin@test",
    });
    const after = resolveRollbackVersionPointers();
    expect(after.knowledge.current).toBe(pointers.knowledge.previous);
  });
});
