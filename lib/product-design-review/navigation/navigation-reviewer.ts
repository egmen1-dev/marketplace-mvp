import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue } from "../types";

export function reviewNavigation(screen: string, sourceFiles: string[], root = process.cwd()): DesignReviewIssue[] {
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

  if (/router\.push\(['"]\/undefined|href=\{undefined\}/.test(combined)) {
    issues.push(
      createIssue({
        screen,
        category: "hierarchy",
        severity: "P0",
        title: "Navigation target resolves to unavailable destination",
        evidence: ["Undefined route target detected in navigation call"],
        recommendation: "Guard navigation targets; hide dead CTAs when route unavailable.",
        source: "static",
      }),
    );
  }

  if (/onPress=\{\(\)\s*=>\s*\{\s*\}\}/.test(combined)) {
    issues.push(
      createIssue({
        screen,
        category: "hierarchy",
        severity: "P1",
        title: "Dead CTA with empty handler",
        evidence: ["Empty onPress handler detected"],
        recommendation: "Wire CTA to real destination or remove until implemented.",
        source: "static",
      }),
    );
  }

  if (screen !== "login" && screen !== "splash" && !/(router\.|useRouter|Link|Stack\.Screen|Tabs\.Screen)/.test(combined)) {
    issues.push(
      createIssue({
        screen,
        category: "hierarchy",
        severity: "P2",
        title: "Screen may lack visible back navigation path",
        evidence: ["No Expo Router navigation primitives detected in screen sources"],
        recommendation: "Ensure stack header back or tab root is available.",
        source: "static",
      }),
    );
  }

  if (/buyer.*seller|seller.*buyer/i.test(combined) && !/mode|switch|toggle/i.test(combined)) {
    issues.push(
      createIssue({
        screen,
        category: "hierarchy",
        severity: "P2",
        title: "Mode switch may be confusing without explicit affordance",
        evidence: ["Buyer/seller references without mode switch pattern"],
        recommendation: "Use explicit profile mode switch with confirmation copy.",
        source: "static",
      }),
    );
  }

  return issues;
}
