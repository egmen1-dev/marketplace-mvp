import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue } from "../types";

export function reviewConversion(screen: string, sourceFiles: string[], root = process.cwd()): DesignReviewIssue[] {
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
  const ctaMatches = combined.match(/(PrimaryCTA|primaryCTA|variant=\"primary\"|mode=\"contained\"|Button.*primary)/gi) ?? [];
  const secondaryMatches = combined.match(/(secondaryCTA|variant=\"secondary\"|outline|ghost)/gi) ?? [];

  if (["pdp", "cart", "checkout", "buyer_home"].includes(screen) && ctaMatches.length === 0) {
    issues.push(
      createIssue({
        screen,
        category: "conversion",
        severity: "P0",
        title: "Missing critical CTA pattern in commerce screen",
        evidence: [`No primary CTA markers found in ${sourceFiles.join(", ")}`],
        recommendation: "Add one dominant primary action with clear commerce copy.",
        source: "static",
      }),
    );
  }

  if (ctaMatches.length >= 3) {
    issues.push(
      createIssue({
        screen,
        category: "conversion",
        severity: "P1",
        title: "Multiple competing primary CTAs detected",
        evidence: [`Primary CTA markers: ${ctaMatches.length}`, `Secondary markers: ${secondaryMatches.length}`],
        recommendation: "Reduce to one primary action; demote others to secondary/tertiary.",
        source: "static",
      }),
    );
  }

  if (/TODO|FIXME|placeholder/i.test(combined) && !/placeholderText|placeholder=/.test(combined) && screen !== "seller_home") {
    issues.push(
      createIssue({
        screen,
        category: "conversion",
        severity: "P2",
        title: "Placeholder copy increases checkout friction",
        evidence: ["Placeholder/TODO markers found in production screen sources"],
        recommendation: "Replace placeholder strings with final user-facing copy.",
        source: "static",
      }),
    );
  }

  return issues;
}
