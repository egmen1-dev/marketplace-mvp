import {
  currentMarketplaceBrainVersion,
  getBrainVersionRegistry,
  resolveBrainVersionEntry,
} from "@/lib/ccos/knowledge/versions";

import { appendRollbackAudit } from "./audit";
import { assertHumanApprovedRollback } from "./governance";
import { getVerifiedBrainVersion } from "./registry";
import type { RollbackRequestInput } from "./types";

let activeBrainOverride: string | null = null;

export function getActiveBrainVersion(): string {
  return activeBrainOverride ?? currentMarketplaceBrainVersion();
}

export function getPreviousBrainVersion(current?: string): string | null {
  const active = current ?? getActiveBrainVersion();
  const registry = getBrainVersionRegistry();
  const idx = registry.findIndex((r) => r.brainVersion === active);
  if (idx <= 0) return null;
  return registry[idx - 1]?.brainVersion ?? null;
}

export function performBrainRollback(input: RollbackRequestInput): {
  ok: boolean;
  activeVersion: string;
  auditId: string;
} {
  assertHumanApprovedRollback(input);
  if (input.artifactType !== "brain_version") {
    throw new Error("performBrainRollback requires brain_version artifact");
  }

  const fromVerified = getVerifiedBrainVersion(input.fromVersion);
  const toVerified = getVerifiedBrainVersion(input.toVersion);
  if (!fromVerified || !toVerified) {
    throw new Error("Rollback requires verified brain versions");
  }

  const active = getActiveBrainVersion();
  if (active !== input.fromVersion) {
    throw new Error(`Active brain version is ${active}, expected ${input.fromVersion}`);
  }

  resolveBrainVersionEntry(input.toVersion);
  activeBrainOverride = input.toVersion;

  const audit = appendRollbackAudit({
    artifactType: "brain_version",
    fromVersion: input.fromVersion,
    toVersion: input.toVersion,
    reason: input.reason,
    requestedBy: input.requestedBy,
    approvedBy: input.approvedBy,
  });

  return { ok: true, activeVersion: input.toVersion, auditId: audit.id };
}

export function resetBrainRollbackState(): void {
  activeBrainOverride = null;
}

export function canRollbackBrain(fromVersion: string, toVersion: string): boolean {
  return Boolean(getVerifiedBrainVersion(fromVersion)) && Boolean(getVerifiedBrainVersion(toVersion));
}
