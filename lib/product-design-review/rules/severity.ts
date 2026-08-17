import type { DesignReviewIssue, DesignReviewSeverity } from "../types";

const SEVERITY_RANK: Record<DesignReviewSeverity, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  INFO: 3,
};

export function compareSeverity(a: DesignReviewSeverity, b: DesignReviewSeverity): number {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b];
}

export function countBySeverity(issues: DesignReviewIssue[]): Record<DesignReviewSeverity, number> {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { P0: 0, P1: 0, P2: 0, INFO: 0 } as Record<DesignReviewSeverity, number>,
  );
}

export function hasCriticalAccessibilityFail(issues: DesignReviewIssue[]): boolean {
  return issues.some(
    (issue) =>
      issue.category === "accessibility" &&
      (issue.severity === "P0" ||
        (issue.severity === "P1" &&
          /touch target|contrast|accessibilityLabel|icon-only/i.test(issue.title))),
  );
}

export function hasCriticalNavigationFail(issues: DesignReviewIssue[]): boolean {
  return issues.some(
    (issue) =>
      issue.category === "hierarchy" &&
      issue.severity === "P0" &&
      /navigation|dead cta|unavailable destination/i.test(issue.title),
  );
}

export function hasCriticalCrudFail(issues: DesignReviewIssue[]): boolean {
  return issues.some(
    (issue) =>
      issue.source === "static" &&
      issue.severity === "P0" &&
      /crud|admin table|debug panel|raw api/i.test(issue.title),
  );
}

export function hasCriticalRegressionFail(issues: DesignReviewIssue[]): boolean {
  return issues.some(
    (issue) =>
      issue.source === "baseline" &&
      issue.severity === "P0" &&
      /regression|missing element|layout shift critical/i.test(issue.title),
  );
}

export function hasMissingCriticalCta(issues: DesignReviewIssue[]): boolean {
  return issues.some(
    (issue) =>
      issue.category === "conversion" &&
      issue.severity === "P0" &&
      /missing critical cta|no primary action/i.test(issue.title),
  );
}
