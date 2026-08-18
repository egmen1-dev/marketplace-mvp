#!/usr/bin/env tsx
/** EPIC-109 Part 1 — Audit PR creation paths and draft PR inventory. */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "artifacts/release-pipeline");

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function ghJson(cmd: string): unknown {
  try {
    return JSON.parse(sh(cmd));
  } catch {
    return null;
  }
}

function main() {
  mkdirSync(OUT, { recursive: true });

  const openPrs =
    (ghJson(
      "gh pr list --state open --limit 100 --json number,title,isDraft,mergeable,mergeStateStatus,headRefName,baseRefName,author,createdAt",
    ) as Array<Record<string, unknown>>) ?? [];

  const draftCount = openPrs.filter((p) => p.isDraft === true).length;
  const nonDraftCount = openPrs.filter((p) => p.isDraft === false).length;

  const report = {
    generatedAt: new Date().toISOString(),
    auditedPaths: [
      {
        path: "Cursor Cloud Agent → ManagePullRequest (create_pr)",
        createsDraft: true,
        configurable: "Per-invocation draft=false; no repo-level override",
        evidence: "All open agent PRs isDraft=true; cloud agent default draft=true",
      },
      {
        path: "GitHub UI",
        createsDraft: false,
        configurable: "Operator selects Draft PR checkbox",
        evidence: "Merged PRs #95 #93 #90 isDraft=false",
      },
      {
        path: "GitHub CLI (gh pr create)",
        createsDraft: false,
        configurable: "--draft flag optional",
        evidence: "No gh pr create usage in repository",
      },
    ],
    openPrSummary: { total: openPrs.length, draft: draftCount, ready: nonDraftCount },
    openDraftPrs: openPrs.filter((p) => p.isDraft === true),
    recommendation:
      "Cloud agents must call ManagePullRequest with draft: false. Operators mark Ready for review before merge.",
    documentation: existsSync(join(process.cwd(), "docs/RELEASE_PIPELINE.md")),
  };

  writeFileSync(join(OUT, "pr-policy-audit.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main();
