import type { ChangeSet, ChangeSetEntry, ChangeType } from "./types";

export function buildChangeSet(input: {
  baseVersion: string;
  candidateVersion: string;
  entries: ChangeSetEntry[];
  evidenceIds?: string[];
  experimentIds?: string[];
  reason: string;
}): ChangeSet {
  if (input.entries.length === 0) {
    throw new Error("Change set must not be empty — opaque candidates forbidden");
  }

  const summaryLines = input.entries.map(
    (e) => `${e.field} ${String(e.from)} → ${String(e.to)} (${e.changeType})`,
  );

  return {
    baseVersion: input.baseVersion,
    candidateVersion: input.candidateVersion,
    summary: `${input.baseVersion} → ${input.candidateVersion}\nChanged:\n${summaryLines.join("\n")}\nReason: ${input.reason}`,
    entries: input.entries,
    evidenceIds: input.evidenceIds ?? [],
    experimentIds: input.experimentIds ?? [],
  };
}

export function applyWeightChange(
  weights: Record<string, number>,
  field: string,
  to: number,
  changeType: ChangeType = "WEIGHT_CHANGE",
): ChangeSetEntry {
  const from = weights[field] ?? 0;
  weights[field] = to;
  return { changeType, field, from, to };
}

export function formatChangeSetForAdmin(changeSet: ChangeSet): string {
  return changeSet.summary;
}
