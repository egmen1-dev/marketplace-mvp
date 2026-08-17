import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { evaluatePrDesignGate } from "../rules/gate-policy";
import { countBySeverity, hasCriticalAccessibilityFail } from "../rules/severity";
import { BUYER_BASELINE_SCREENS, SELLER_READINESS_SCREENS } from "../screens/registry";
import { findScreenshotFile, loadBaselineManifest } from "../screenshot/intake";
import type {
  DesignReviewFinalVerdicts,
  DesignReviewReport,
  DesignReviewResult,
  PhysicalBaselineCoverage,
  ReleaseComparison,
} from "../types";

export const DEFAULT_RELEASE = "0.1.4-alpha";

export function buildDesignReviewReport(
  results: DesignReviewResult[],
  release: string,
  root = process.cwd(),
): DesignReviewReport {
  const summary = summarizeResults(results, release, root);
  const finalVerdicts = buildFinalVerdicts(results, summary);
  return {
    epic: "EPIC-87",
    release,
    generatedAt: new Date().toISOString(),
    reviewRulesVersion: results[0]?.reviewRulesVersion ?? "1.0.0",
    designSystemVersion: results[0]?.designSystemVersion ?? "1.0.0",
    screens: results,
    summary,
    physicalBaselineCoverage: summary.physicalBaselineCoverage,
    sellerSprint1: finalVerdicts.sellerExperienceSprint1,
    finalVerdicts,
  };
}

function summarizeResults(results: DesignReviewResult[], release: string, root: string) {
  const allIssues = results.flatMap((r) => r.issues);
  const counts = countBySeverity(allIssues);
  const pass = results.filter((r) => r.verdict === "PASS").length;
  const watch = results.filter((r) => r.verdict === "WATCH").length;
  const fail = results.filter((r) => r.verdict === "FAIL").length;
  const regressions = allIssues.filter((i) => i.source === "baseline" && /regression/i.test(i.title)).length;

  const buyerTotal = BUYER_BASELINE_SCREENS.length;
  const buyerCovered = BUYER_BASELINE_SCREENS.filter((s) => findScreenshotFile(release, s.id, root)).length;
  const approved = loadBaselineManifest(release, root).map((a) => a.screen);
  const missing = BUYER_BASELINE_SCREENS.filter((s) => !findScreenshotFile(release, s.id, root)).map((s) => s.id);

  const physicalBaselineCoverage: PhysicalBaselineCoverage = {
    covered: buyerCovered,
    total: buyerTotal,
    missing,
    approved,
  };

  return {
    pass,
    watch,
    fail,
    p0: counts.P0,
    p1: counts.P1,
    p2: counts.P2,
    regressions,
    screenshotCoverage: buyerCovered,
    screenshotTotal: buyerTotal,
    physicalBaselineCoverage,
  };
}

function buildFinalVerdicts(
  results: DesignReviewResult[],
  summary: ReturnType<typeof summarizeResults>,
): DesignReviewFinalVerdicts {
  const gate = evaluatePrDesignGate(results);
  const hasScreenshotEvidence = results.some((r) => r.confidence === "HIGHER");
  const hasMissingPhysical = results.some((i) =>
    i.issues.some((issue) => issue.title.includes("MISSING_PHYSICAL_EVIDENCE")),
  );
  const sellerScreens = SELLER_READINESS_SCREENS.map((s) => s.id);
  const sellerReviewed = results.filter((r) => sellerScreens.includes(r.screen as typeof sellerScreens[number]));
  const sellerHasEvidence = sellerScreens.some((id) =>
    results.find((r) => r.screen === id)?.issues.some((i) => i.source === "screenshot" && !i.title.includes("MISSING")),
  );

  const screenshotReview: DesignReviewFinalVerdicts["screenshotReview"] = hasMissingPhysical
    ? "PARTIAL"
    : hasScreenshotEvidence
      ? "PASS"
      : "FAIL";

  const visualRegression: DesignReviewFinalVerdicts["visualRegression"] =
    summary.regressions > 0 ? "PARTIAL" : summary.physicalBaselineCoverage.approved.length > 0 ? "PASS" : "PARTIAL";

  const accessibilityGate: DesignReviewFinalVerdicts["accessibilityGate"] = hasCriticalAccessibilityFail(
    results.flatMap((r) => r.issues),
  )
    ? "FAIL"
    : "PASS";

  const sellerExperienceSprint1: DesignReviewFinalVerdicts["sellerExperienceSprint1"] =
    sellerHasEvidence && summary.physicalBaselineCoverage.approved.length >= 1 ? "UNBLOCKED" : "BLOCKED";

  return {
    designReviewCore: "READY",
    staticReview: gate.counts.P0 > 0 ? "FAIL" : "PASS",
    screenshotReview,
    visualRegression,
    accessibilityGate,
    physicalBaselineCoverage: `${summary.physicalBaselineCoverage.covered}/${summary.physicalBaselineCoverage.total}`,
    prDesignGate: gate.ready ? "READY" : "NOT READY",
    sellerExperienceSprint1,
  };
}

export function compareReleaseDesignQuality(
  fromRelease: string,
  toRelease: string,
  fromResults: DesignReviewResult[],
  toResults: DesignReviewResult[],
): ReleaseComparison {
  const fromP2 = countBySeverity(fromResults.flatMap((r) => r.issues)).P2;
  const toP2 = countBySeverity(toResults.flatMap((r) => r.issues)).P2;
  const fromReg = fromResults.flatMap((r) => r.issues).filter((i) => i.source === "baseline").length;
  const toReg = toResults.flatMap((r) => r.issues).filter((i) => i.source === "baseline").length;

  return {
    fromRelease,
    toRelease,
    visualConsistencyDeltaPct: null,
    accessibilityDelta: "unchanged",
    regressionsFixed: Math.max(0, fromReg - toReg),
    regressionsNew: Math.max(0, toReg - fromReg),
    p2Delta: toP2 - fromP2,
    notes: ["Release comparison uses issue evidence counts — not advisory scores."],
  };
}

export function saveDesignReviewReport(report: DesignReviewReport, root = process.cwd()): string {
  const dir = join(root, "artifacts/design-review", report.release);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "design-review-report.json");
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

export function formatScreenReport(result: DesignReviewResult): string {
  const counts = countBySeverity(result.issues);
  const lines = [
    `SCREEN: ${result.screen}`,
    `VERDICT: ${result.verdict}`,
    `CONFIDENCE: ${result.confidence}`,
    "",
    `P0: ${counts.P0}`,
    `P1: ${counts.P1}`,
    `P2: ${counts.P2}`,
    "",
  ];

  for (const severity of ["P0", "P1", "P2", "INFO"] as const) {
    const bucket = result.issues.filter((i) => i.severity === severity);
    if (bucket.length === 0) continue;
    lines.push(`${severity}:`);
    for (const issue of bucket) {
      lines.push(issue.title);
      lines.push("Evidence:");
      for (const e of issue.evidence) lines.push(`  ${e}`);
      lines.push(`Recommendation: ${issue.recommendation}`);
      lines.push("");
    }
  }

  lines.push("Advisory scores (non-blocking):");
  lines.push(JSON.stringify(result.scores, null, 2));
  return lines.join("\n");
}

export function loadLatestReport(release: string, root = process.cwd()): DesignReviewReport | null {
  const path = join(root, "artifacts/design-review", release, "design-review-report.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as DesignReviewReport;
}
