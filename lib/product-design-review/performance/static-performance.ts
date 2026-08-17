import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue } from "../types";

/** Static heuristics only — not a runtime performance verdict. */
export function reviewPerformanceStatic(
  screen: string,
  sourceFiles: string[],
  root = process.cwd(),
): DesignReviewIssue[] {
  const issues: DesignReviewIssue[] = [];

  for (const file of sourceFiles) {
    let content: string;
    try {
      content = readFileSync(join(root, file), "utf8");
    } catch {
      continue;
    }

    if (/ScrollView[\s\S]*FlatList|FlatList[\s\S]*ScrollView/.test(content)) {
      issues.push(
        createIssue({
          screen,
          category: "performance",
          severity: "P1",
          title: "Potential nested ScrollView/FlatList pattern",
          component: file,
          evidence: [`${file}: nested scroll containers detected (static heuristic)`],
          recommendation: "Avoid nested virtualized lists; use single scroll owner.",
          source: "static",
        }),
      );
    }

    const mapRenders = (content.match(/\.map\s*\([\s\S]*?=>[\s\S]*?<(?:View|Text|Pressable)/g) ?? []).length;
    if (mapRenders >= 2 && !content.includes("FlatList") && !content.includes("FlashList")) {
      issues.push(
        createIssue({
          screen,
          category: "performance",
          severity: "P2",
          title: "Large unvirtualized list render candidate",
          component: file,
          evidence: [`${file}: ${mapRenders} inline .map JSX renders without FlatList`],
          recommendation: "Virtualize long lists; measure scroll on physical device.",
          source: "static",
        }),
      );
    }

    if (/useEffect\([\s\S]*setState[\s\S]*\)\s*,\s*\[[^\]]*items[^\]]*\]/.test(content)) {
      issues.push(
        createIssue({
          screen,
          category: "performance",
          severity: "P2",
          title: "Potential unstable render callback / effect loop",
          component: file,
          evidence: [`${file}: effect depends on items and sets state (heuristic)`],
          recommendation: "Stabilize dependencies; profile render count on device.",
          source: "static",
        }),
      );
    }

    if (/source=\{\{\s*uri:[\s\S]*width:\s*(?:1000|1200|1920)/.test(content)) {
      issues.push(
        createIssue({
          screen,
          category: "performance",
          severity: "P2",
          title: "Oversized remote image dimensions declared",
          component: file,
          evidence: [`${file}: large image width in source props`],
          recommendation: "Request appropriately sized CDN variants.",
          source: "static",
        }),
      );
    }
  }

  return issues;
}

export type RuntimePerformanceEvidence = {
  coldStartMs?: number;
  screenRenderMs?: number;
  scrollJankEvents?: number;
  memoryWarning?: boolean;
};

export function attachRuntimePerformanceEvidence(
  screen: string,
  evidence: RuntimePerformanceEvidence,
): DesignReviewIssue[] {
  const issues: DesignReviewIssue[] = [];
  if (typeof evidence.screenRenderMs === "number" && evidence.screenRenderMs > 800) {
    issues.push(
      createIssue({
        screen,
        category: "performance",
        severity: "P1",
        title: "Screen render exceeds 800ms on physical device",
        evidence: [`screenRenderMs=${evidence.screenRenderMs} (runtime measurement)`],
        recommendation: "Reduce initial render work; defer non-critical sections.",
        source: "runtime",
      }),
    );
  }
  if (evidence.memoryWarning) {
    issues.push(
      createIssue({
        screen,
        category: "performance",
        severity: "P1",
        title: "Memory warning observed during screen session",
        evidence: ["Android memory warning event captured"],
        recommendation: "Audit image cache and list virtualization.",
        source: "runtime",
      }),
    );
  }
  return issues;
}
