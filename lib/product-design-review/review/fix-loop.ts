import { createHash } from "node:crypto";

import type { DesignReviewIssue } from "../types";

/** Stable issue IDs across reruns when the underlying problem is the same. */
export function stableIssueId(input: {
  screen: string;
  category: DesignReviewIssue["category"];
  title: string;
  component?: string;
}): string {
  const raw = [input.screen, input.category, input.component ?? "", input.title].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

export function createIssue(
  input: Omit<DesignReviewIssue, "id"> & { id?: string },
): DesignReviewIssue {
  return {
    ...input,
    id: input.id ?? stableIssueId(input),
  };
}

export function mergeIssueRuns(
  previous: DesignReviewIssue[],
  current: DesignReviewIssue[],
): { resolved: DesignReviewIssue[]; remaining: DesignReviewIssue[]; newIssues: DesignReviewIssue[] } {
  const prevIds = new Set(previous.map((i) => i.id));
  const currIds = new Set(current.map((i) => i.id));
  const resolved = previous.filter((i) => !currIds.has(i.id));
  const remaining = current.filter((i) => prevIds.has(i.id));
  const newIssues = current.filter((i) => !prevIds.has(i.id));
  return { resolved, remaining, newIssues };
}
