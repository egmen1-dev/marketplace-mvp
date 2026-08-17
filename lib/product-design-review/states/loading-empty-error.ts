import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue } from "../types";

const STATE_PATTERNS = {
  loading: [/Skeleton|Shimmer|loading|isLoading/i],
  empty: [/EmptyState|empty state|пуст/i],
  error: [/SectionError|ErrorState|error|retry/i],
  offline: [/offline|Offline|NetworkBanner|cached/i],
};

export function reviewLoadingEmptyError(
  screen: string,
  sourceFiles: string[],
  root = process.cwd(),
): DesignReviewIssue[] {
  if (["splash", "login"].includes(screen)) return [];

  const combined = sourceFiles
    .map((file) => {
      try {
        return readFileSync(join(root, file), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");

  const issues: DesignReviewIssue[] = [];

  for (const [state, patterns] of Object.entries(STATE_PATTERNS)) {
    if (state === "offline") continue;
    const found = patterns.some((p) => p.test(combined));
    if (!found) {
      issues.push(
        createIssue({
          screen,
          category: state === "loading" ? "loading" : state === "error" ? "error" : "consistency",
          severity: state === "loading" || state === "error" ? "P1" : "P2",
          title: `Production screen missing ${state} state pattern`,
          evidence: [`No ${state} pattern found in ${sourceFiles.join(", ")}`],
          recommendation: `Add design-system ${state} component consistent with EPIC 84/85 patterns.`,
          source: "static",
        }),
      );
    }
  }

  return issues;
}
