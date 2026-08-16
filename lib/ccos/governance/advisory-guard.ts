import type { BrainMaturityLevel } from "./maturity";
import { requireBrainCapability } from "./maturity";

export const ADVISORY_ONLY = true as const;

export function assertAdvisoryReport<T extends { advisoryOnly: true }>(report: T): T {
  if (report.advisoryOnly !== true) {
    throw new Error("Cognitive reports must remain advisory-only in Wave 0");
  }
  return report;
}

export function denyAutopilotExecution(level: BrainMaturityLevel): void {
  if (level === "L4_AUTOPILOT") {
    throw new Error("Autopilot execution is disabled in Wave 0 — human confirmation required");
  }
  requireBrainCapability(level, "execute");
}

export function assertNoFinancialExecution(action: string): never {
  throw new Error(`CCOS cannot execute financial action: ${action}`);
}

export function assertNoModerationEnforcement(action: string): never {
  throw new Error(`CCOS cannot enforce moderation action: ${action} — advisory only`);
}
