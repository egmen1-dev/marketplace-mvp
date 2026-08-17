import type { DesignReviewIssue, DesignReviewResult, DesignReviewVerdict } from "../types";
import {
  countBySeverity,
  hasCriticalAccessibilityFail,
  hasCriticalCrudFail,
  hasCriticalNavigationFail,
  hasCriticalRegressionFail,
  hasMissingCriticalCta,
} from "./severity";

export type DesignGateEvaluation = {
  ready: boolean;
  hardBlockers: string[];
  counts: ReturnType<typeof countBySeverity>;
};

/** Scores are advisory — hard blockers use concrete evidence-based issues only. */
export function evaluatePrDesignGate(results: DesignReviewResult[]): DesignGateEvaluation {
  const issues = results.flatMap((r) => r.issues);
  const counts = countBySeverity(issues);
  const hardBlockers: string[] = [];

  if (counts.P0 > 0) {
    hardBlockers.push(`P0 issues: ${counts.P0}`);
  }
  if (hasCriticalAccessibilityFail(issues)) {
    hardBlockers.push("accessibility critical FAIL");
  }
  if (hasCriticalNavigationFail(issues)) {
    hardBlockers.push("broken navigation");
  }
  if (hasMissingCriticalCta(issues)) {
    hardBlockers.push("missing critical CTA");
  }
  if (hasCriticalRegressionFail(issues)) {
    hardBlockers.push("visual regression critical");
  }
  if (hasCriticalCrudFail(issues)) {
    hardBlockers.push("CRUD detection critical");
  }

  return { ready: hardBlockers.length === 0, hardBlockers, counts };
}

export function deriveScreenVerdict(issues: DesignReviewIssue[]): DesignReviewVerdict {
  const counts = countBySeverity(issues);
  if (counts.P0 > 0) return "FAIL";
  if (counts.P1 > 0) return "WATCH";
  return "PASS";
}

export function scoreDoesNotBlockGate(score: number, target: number): boolean {
  return score < target;
}
