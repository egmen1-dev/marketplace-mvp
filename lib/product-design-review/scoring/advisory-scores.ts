import type { DesignReviewIssue, DesignReviewScores } from "../types";

/** Advisory scores derived from issue severities — not gate blockers. */
export function computeAdvisoryScores(issues: DesignReviewIssue[]): DesignReviewScores {
  const base = {
    visual: 9.5,
    marketplaceFeel: 9.5,
    conversion: 9.5,
    trust: 9.5,
    accessibility: 9.5,
    consistency: 9.5,
    polish: 9.5,
  };

  for (const issue of issues) {
    const penalty =
      issue.severity === "P0" ? 2.5 : issue.severity === "P1" ? 1.0 : issue.severity === "P2" ? 0.4 : 0.1;
    const keys = categoryToScoreKeys(issue.category);
    for (const key of keys) {
      base[key] = Math.max(0, Math.round((base[key] - penalty) * 100) / 100);
    }
  }

  return base;
}

function categoryToScoreKeys(category: DesignReviewIssue["category"]): Array<keyof DesignReviewScores> {
  switch (category) {
    case "visual":
    case "consistency":
      return ["visual", "consistency", "polish"];
    case "hierarchy":
    case "motion":
      return ["visual", "polish", "marketplaceFeel"];
    case "commerce":
    case "conversion":
      return ["conversion", "marketplaceFeel"];
    case "trust":
      return ["trust", "marketplaceFeel"];
    case "accessibility":
      return ["accessibility", "trust"];
    case "loading":
    case "error":
      return ["polish", "marketplaceFeel"];
    case "performance":
      return ["polish"];
    default:
      return ["polish"];
  }
}
