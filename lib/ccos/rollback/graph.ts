import {
  getActiveGraphVersion,
  listGraphVersions,
  setActiveGraphVersion,
} from "@/lib/ccos/graph/versioning";

import { appendRollbackAudit } from "./audit";
import { assertHumanApprovedRollback } from "./governance";
import { getVerifiedGraphVersion } from "./registry";
import type { RollbackRequestInput } from "./types";

export function performGraphRollback(input: RollbackRequestInput): {
  ok: boolean;
  activeVersion: string;
  auditId: string;
} {
  assertHumanApprovedRollback(input);
  if (input.artifactType !== "graph_version") {
    throw new Error("performGraphRollback requires graph_version artifact");
  }

  const fromVerified = getVerifiedGraphVersion(input.fromVersion);
  const toVerified = getVerifiedGraphVersion(input.toVersion);
  if (!fromVerified || !toVerified) {
    throw new Error("Rollback requires verified previous and target graph versions");
  }
  if (fromVerified.status !== "ACCEPTED" || toVerified.status !== "ACCEPTED") {
    throw new Error("Only ACCEPTED graph versions can participate in rollback");
  }

  const active = getActiveGraphVersion();
  if (active !== input.fromVersion) {
    throw new Error(`Active graph version is ${active}, expected ${input.fromVersion}`);
  }

  const switched = setActiveGraphVersion(input.toVersion);
  if (!switched) {
    throw new Error(`Graph version ${input.toVersion} not found`);
  }

  const audit = appendRollbackAudit({
    artifactType: "graph_version",
    fromVersion: input.fromVersion,
    toVersion: input.toVersion,
    reason: input.reason,
    requestedBy: input.requestedBy,
    approvedBy: input.approvedBy,
  });

  return { ok: true, activeVersion: switched.version, auditId: audit.id };
}

export function canRollbackGraph(fromVersion: string, toVersion: string): boolean {
  return (
    Boolean(getVerifiedGraphVersion(fromVersion)) &&
    Boolean(getVerifiedGraphVersion(toVersion)) &&
    listGraphVersions().some((v) => v.version === toVersion)
  );
}
