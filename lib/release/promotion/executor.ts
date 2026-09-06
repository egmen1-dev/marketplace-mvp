import { execSync } from "node:child_process";

import type { PrStackEntry } from "./types";

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

export type PromotionExecutionResult = {
  generatedAt: string;
  mode: "dry-run" | "execute";
  actions: Array<{ pr: number; action: string; ok: boolean; detail?: string }>;
  verdict: "PASS" | "FAIL" | "SKIPPED";
};

/**
 * Merges PRs only when PROMOTION_EXECUTE=1. Default is dry-run report for operators.
 */
export class PromotionExecutor {
  execute(stack: PrStackEntry[], options?: { dryRun?: boolean }): PromotionExecutionResult {
    const dryRun = options?.dryRun ?? process.env.PROMOTION_EXECUTE !== "1";
    const actions: PromotionExecutionResult["actions"] = [];

    for (const entry of stack) {
      if (entry.merged) {
        actions.push({ pr: entry.pr, action: "skip_already_merged", ok: true });
        continue;
      }
      if (entry.isDraft) {
        actions.push({
          pr: entry.pr,
          action: "blocked_draft",
          ok: false,
          detail: "Mark Ready for review before merge",
        });
        continue;
      }
      if (dryRun) {
        actions.push({
          pr: entry.pr,
          action: "would_merge",
          ok: entry.mergeable === "MERGEABLE",
          detail: entry.mergeStateStatus,
        });
        continue;
      }
      try {
        sh(`gh pr merge ${entry.pr} --merge --admin`);
        actions.push({ pr: entry.pr, action: "merged", ok: true });
      } catch (err) {
        actions.push({
          pr: entry.pr,
          action: "merge_failed",
          ok: false,
          detail: err instanceof Error ? err.message.slice(0, 200) : "error",
        });
      }
    }

    const failed = actions.some((a) => !a.ok && a.action !== "skip_already_merged");
    return {
      generatedAt: new Date().toISOString(),
      mode: dryRun ? "dry-run" : "execute",
      actions,
      verdict: failed ? "FAIL" : dryRun ? "SKIPPED" : "PASS",
    };
  }
}
