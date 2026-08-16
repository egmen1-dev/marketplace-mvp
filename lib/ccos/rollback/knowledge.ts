import { KNOWLEDGE_PACK_VERSION } from "@/lib/ccos/knowledge/versions";

import { appendRollbackAudit } from "./audit";
import { assertHumanApprovedRollback } from "./governance";
import { getVerifiedKnowledgeVersion } from "./registry";
import type { RollbackRequestInput } from "./types";

const KNOWLEDGE_PACK_ORDER = ["knowledge-pack-v1", "knowledge-pack-v2"] as const;

let activeKnowledgePackOverride: string | null = null;

export function getActiveKnowledgePackVersion(): string {
  return activeKnowledgePackOverride ?? KNOWLEDGE_PACK_VERSION;
}

export function getPreviousKnowledgePackVersion(current?: string): string | null {
  const active = current ?? getActiveKnowledgePackVersion();
  const idx = KNOWLEDGE_PACK_ORDER.indexOf(active as (typeof KNOWLEDGE_PACK_ORDER)[number]);
  if (idx <= 0) return null;
  return KNOWLEDGE_PACK_ORDER[idx - 1] ?? null;
}

export function performKnowledgePackRollback(input: RollbackRequestInput): {
  ok: boolean;
  activeVersion: string;
  auditId: string;
} {
  assertHumanApprovedRollback(input);
  if (input.artifactType !== "knowledge_version") {
    throw new Error("performKnowledgePackRollback requires knowledge_version artifact");
  }

  const fromVerified = getVerifiedKnowledgeVersion(input.fromVersion);
  const toVerified = getVerifiedKnowledgeVersion(input.toVersion);
  if (!fromVerified || !toVerified) {
    throw new Error("Rollback requires verified knowledge pack versions");
  }

  const active = getActiveKnowledgePackVersion();
  if (active !== input.fromVersion) {
    throw new Error(`Active knowledge pack is ${active}, expected ${input.fromVersion}`);
  }

  activeKnowledgePackOverride = input.toVersion;

  const audit = appendRollbackAudit({
    artifactType: "knowledge_version",
    fromVersion: input.fromVersion,
    toVersion: input.toVersion,
    reason: input.reason,
    requestedBy: input.requestedBy,
    approvedBy: input.approvedBy,
  });

  return { ok: true, activeVersion: input.toVersion, auditId: audit.id };
}

export function resetKnowledgeRollbackState(): void {
  activeKnowledgePackOverride = null;
}

/** Atomic bundle promotion — switches active knowledge pack pointer. */
export function setActiveKnowledgePackVersionForPromotion(version: string): void {
  activeKnowledgePackOverride = version;
}

export function canRollbackKnowledge(fromVersion: string, toVersion: string): boolean {
  return (
    Boolean(getVerifiedKnowledgeVersion(fromVersion)) &&
    Boolean(getVerifiedKnowledgeVersion(toVersion))
  );
}
