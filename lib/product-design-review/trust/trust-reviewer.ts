import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue } from "../types";

const FABRICATED_TRUST = [
  /100% guarantee/i,
  /best price guaranteed/i,
  /official partner badge/i,
  /verified by lot/i,
];

export function reviewTrust(screen: string, sourceFiles: string[], root = process.cwd()): DesignReviewIssue[] {
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

  for (const regex of FABRICATED_TRUST) {
    if (regex.test(combined)) {
      issues.push(
        createIssue({
          screen,
          category: "trust",
          severity: "P0",
          title: "Potentially fabricated trust signal",
          evidence: [`Matched unsupported trust claim: ${regex.source}`],
          recommendation: "Remove unsupported claims; use API-backed trust data only.",
          source: "static",
        }),
      );
    }
  }

  if (/sellerId|userId|orderId|uuid/i.test(combined) && /Text>.*\{/.test(combined)) {
    issues.push(
      createIssue({
        screen,
        category: "trust",
        severity: "P1",
        title: "Raw technical identifier may be visible to user",
        evidence: ["Technical id fields referenced in JSX text rendering"],
        recommendation: "Show human-readable seller/order labels instead of raw IDs.",
        source: "static",
      }),
    );
  }

  if (/delete account|danger zone|destructive/i.test(combined) && !/confirm|подтверд/i.test(combined)) {
    issues.push(
      createIssue({
        screen,
        category: "trust",
        severity: "P1",
        title: "Destructive action without confirmation pattern",
        evidence: ["Destructive action copy found without confirmation guard"],
        recommendation: "Add explicit confirmation step for destructive actions.",
        source: "static",
      }),
    );
  }

  return issues;
}
