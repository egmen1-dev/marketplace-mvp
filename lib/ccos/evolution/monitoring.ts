import { getActiveBrainVersion, setActiveBrainVersionForPromotion } from "@/lib/ccos/rollback/brain";
import { performBrainRollback } from "@/lib/ccos/rollback/brain";
import { appendRollbackAudit } from "@/lib/ccos/rollback/audit";
import { getVerifiedBrainVersion } from "@/lib/ccos/rollback/registry";
import { getPrePromotionSnapshot } from "./candidate";
import { appendEvolutionMemoryEvent } from "./memory";
import { getCandidate, updateCandidate } from "./candidate";
import { assertEvolutionPlatformEnabled, assertHumanReviewer, assertNoAutomaticRollback } from "./governance";

export type MonitoringWindow = {
  candidateId: string;
  startedAt: string;
  endsAt: string;
  metrics: {
    reportErrors: number;
    confidenceShift: number;
    blockerShift: number;
    recommendRollback: boolean;
  };
};

const windows = new Map<string, MonitoringWindow>();

export function startPostPromotionMonitoring(candidateId: string): MonitoringWindow {
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + 24 * 60 * 60 * 1000);
  const window: MonitoringWindow = {
    candidateId,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    metrics: {
      reportErrors: 0,
      confidenceShift: 0,
      blockerShift: 0,
      recommendRollback: false,
    },
  };
  windows.set(candidateId, window);
  return window;
}

export function evaluateMonitoring(candidateId: string, input?: { reportErrors?: number; blockerShift?: number }): MonitoringWindow {
  const window = windows.get(candidateId);
  if (!window) throw new Error("Monitoring window not found");

  if (input?.reportErrors !== undefined) window.metrics.reportErrors = input.reportErrors;
  if (input?.blockerShift !== undefined) window.metrics.blockerShift = input.blockerShift;

  if (window.metrics.reportErrors > 5 || window.metrics.blockerShift > 0.25) {
    window.metrics.recommendRollback = true;
    appendEvolutionMemoryEvent({
      kind: "rollback_recommended",
      candidateId,
      actor: "evolution-monitoring",
      detail: "Monitoring detected regression — rollback recommended (not auto-executed)",
    });
  }

  return window;
}

export function executeEvolutionRollback(input: {
  fromVersion: string;
  toVersion: string;
  approvedBy: string;
  requestedBy: string;
  reason: string;
  candidateId?: string;
}): { ok: boolean; activeVersion: string } {
  assertEvolutionPlatformEnabled();
  assertHumanReviewer(input.approvedBy);
  assertNoAutomaticRollback(input.approvedBy);

  const active = getActiveBrainVersion();
  if (active !== input.fromVersion) {
    throw new Error(`Active brain ${active} != ${input.fromVersion}`);
  }

  let activeVersion = input.toVersion;
  if (getVerifiedBrainVersion(input.fromVersion) && getVerifiedBrainVersion(input.toVersion)) {
    const result = performBrainRollback({
      artifactType: "brain_version",
      fromVersion: input.fromVersion,
      toVersion: input.toVersion,
      approvedBy: input.approvedBy,
      requestedBy: input.requestedBy,
      reason: input.reason,
    });
    activeVersion = result.activeVersion;
  } else {
    setActiveBrainVersionForPromotion(input.fromVersion, input.toVersion);
    appendRollbackAudit({
      artifactType: "brain_version",
      fromVersion: input.fromVersion,
      toVersion: input.toVersion,
      reason: input.reason,
      requestedBy: input.requestedBy,
      approvedBy: input.approvedBy,
    });
  }

  if (input.candidateId) {
    updateCandidate(input.candidateId, {
      status: "ROLLED_BACK",
      rolledBackAt: new Date().toISOString(),
    });
  }

  appendEvolutionMemoryEvent({
    kind: "rolled_back",
    candidateId: input.candidateId,
    actor: input.approvedBy,
    detail: `${input.fromVersion} → ${input.toVersion}: ${input.reason}`,
  });

  return { ok: true, activeVersion };
}

export function getMonitoringWindow(candidateId: string): MonitoringWindow | null {
  return windows.get(candidateId) ?? null;
}

export function resetMonitoring(): void {
  windows.clear();
}

export function getRollbackTarget(): string | null {
  return getPrePromotionSnapshot()?.bundle.brainVersion ?? null;
}
