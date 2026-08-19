import { execSync } from "node:child_process";

import { CLOSED_BETA_PROMOTION_STACK } from "./config";
import type { PrStackEntry, ReleasePrStackReport, PromotionStatus } from "./types";

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function ghPr(pr: number) {
  try {
    return JSON.parse(
      sh(
        `gh pr view ${pr} --json number,state,isDraft,mergedAt,mergeable,mergeStateStatus,headRefName,baseRefName`,
      ),
    ) as {
      number: number;
      state: string;
      isDraft: boolean;
      mergedAt: string | null;
      mergeable: string;
      mergeStateStatus: string;
      headRefName: string;
      baseRefName: string;
    };
  } catch {
    return null;
  }
}

export class PromotionPlanner {
  plan(stack = CLOSED_BETA_PROMOTION_STACK): ReleasePrStackReport {
    sh("git fetch origin main 2>/dev/null || true");
    const gaps: string[] = [];
    const missingParents: string[] = [];
    const missingPrs: number[] = [];
    const entries: PrStackEntry[] = [];

    let previousHead: string | null = null;
    for (const item of stack) {
      const gh = ghPr(item.pr);
      if (!gh) {
        missingPrs.push(item.pr);
        entries.push({
          ...item,
          verdict: "FAIL",
          detail: "PR not found on GitHub",
        });
        continue;
      }

      const ref = `origin/${gh.headRefName}`;
      let headSha = "";
      let parentSha = "";
      try {
        headSha = sh(`git rev-parse ${ref}`);
        parentSha = sh(`git log -1 --format=%P ${ref}`).split(" ")[0] ?? "";
      } catch {
        gaps.push(`PR #${item.pr}: cannot resolve ${ref}`);
      }

      const parentMatchesPrevious =
        previousHead === null ? parentSha === sh("git rev-parse origin/main") : parentSha === previousHead;

      if (previousHead !== null && headSha && !parentMatchesPrevious) {
        missingParents.push(`PR #${item.pr}: parent ${parentSha.slice(0, 7)} ≠ previous ${previousHead.slice(0, 7)}`);
      }

      const merged = Boolean(gh.mergedAt) || gh.state === "MERGED";
      let verdict: PromotionStatus = "PENDING";
      if (merged) verdict = "PASS";
      else if (gh.isDraft) verdict = "BLOCKED";
      else if (gh.mergeable === "MERGEABLE" && gh.mergeStateStatus === "CLEAN") verdict = "PENDING";
      else verdict = "FAIL";

      entries.push({
        pr: item.pr,
        epic: item.epic,
        branch: item.branch,
        headSha,
        parentSha,
        isDraft: gh.isDraft,
        merged: merged,
        mergeable: gh.mergeable,
        mergeStateStatus: gh.mergeStateStatus,
        state: gh.state,
        parentMatchesPrevious,
        verdict,
        detail: merged ? "merged" : gh.isDraft ? "draft" : gh.mergeStateStatus,
      });

      if (headSha) previousHead = headSha;
    }

    const linear = missingParents.length === 0 && gaps.length === 0;
    const allMerged = entries.every((e) => e.merged);
    const verdict: PromotionStatus = missingPrs.length > 0 || !linear ? "FAIL" : allMerged ? "PASS" : "PENDING";

    return {
      generatedAt: new Date().toISOString(),
      stack: entries,
      linear,
      gaps,
      missingParents,
      missingPrs,
      verdict,
    };
  }
}
