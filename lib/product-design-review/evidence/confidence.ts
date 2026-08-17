import type { DesignReviewConfidence, DesignReviewIssue } from "../types";

export function deriveConfidence(issues: DesignReviewIssue[]): DesignReviewConfidence {
  const hasPositiveScreenshotEvidence = issues.some(
    (i) =>
      (i.source === "screenshot" || i.source === "baseline") &&
      !i.title.includes("MISSING_PHYSICAL_EVIDENCE"),
  );
  const hasRuntime = issues.some((i) => i.source === "runtime");
  if (hasPositiveScreenshotEvidence || hasRuntime) return "HIGHER";
  if (issues.some((i) => i.source === "static")) return "MEDIUM";
  return "LOW";
}

export function formatEvidenceBlock(issue: DesignReviewIssue): string {
  return issue.evidence.map((line) => `- ${line}`).join("\n");
}

export function formatIssueReport(issue: DesignReviewIssue): string {
  return [
    `${issue.severity}: ${issue.title}`,
    issue.component ? `Component: ${issue.component}` : null,
    "Evidence:",
    formatEvidenceBlock(issue),
    `Recommendation: ${issue.recommendation}`,
  ]
    .filter(Boolean)
    .join("\n");
}
