import { isCcosEvolutionPlatformEnabled } from "./flags";
import { getCurrentProductionBundle, getPendingCandidate, listCandidates } from "./candidate";
import { getRollbackTarget, getMonitoringWindow } from "./monitoring";
import { getActiveBrainVersion, getPreviousBrainVersion } from "@/lib/ccos/rollback/brain";
import { resolveRollbackVersionPointers } from "@/lib/ccos/rollback";

export function buildEvolutionHealthReport() {
  const enabled = isCcosEvolutionPlatformEnabled();
  const bundle = getCurrentProductionBundle();
  const pending = getPendingCandidate();
  const pointers = resolveRollbackVersionPointers();

  return {
    enabled,
    currentBundle: bundle,
    rollbackTarget: getRollbackTarget() ?? pointers.brain.previous,
    currentBrain: getActiveBrainVersion(),
    previousBrain: getPreviousBrainVersion(),
    pendingCandidate: pending
      ? {
          id: pending.id,
          version: pending.version,
          status: pending.status,
          riskTier: pending.riskTier,
        }
      : null,
    monitoring: pending ? getMonitoringWindow(pending.id) : null,
    candidateCount: listCandidates().length,
    autopilot: "DISABLED",
    learningEngine: "NOT_ACTIVE",
    evaluatedAt: new Date().toISOString(),
  };
}
