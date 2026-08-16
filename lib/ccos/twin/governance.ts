import { assertNoFinancialExecution, assertNoModerationEnforcement } from "@/lib/ccos/governance/advisory-guard";

export const TWIN_GOVERNANCE_VERSION = "twin-governance-v1";

export function assertTwinGovernance(): {
  twinToProductionBlocked: true;
  requiresHumanApproval: true;
  shadowRankingOnly: true;
} {
  return {
    twinToProductionBlocked: true,
    requiresHumanApproval: true,
    shadowRankingOnly: true,
  };
}

/** Twin must never mutate production systems. */
export function denyTwinProductionWrite(action: string): never {
  throw new Error(`Twin cannot write to production: ${action}. Path: Twin → Decision → Human → Production`);
}

export function assertTwinAdvisoryOnly<T extends { advisoryOnly: true }>(value: T): T {
  if (value.advisoryOnly !== true) {
    throw new Error("Twin outputs must remain advisory-only");
  }
  return value;
}

export function guardTwinFinancialAction(action: string): void {
  assertNoFinancialExecution(`twin:${action}`);
}

export function guardTwinModerationAction(action: string): void {
  assertNoModerationEnforcement(`twin:${action}`);
}
