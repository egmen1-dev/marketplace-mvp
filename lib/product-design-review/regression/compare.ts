import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { createIssue } from "../review/fix-loop";
import type { DesignReviewIssue } from "../types";
import { findScreenshotFile, loadBaselineManifest } from "../screenshot/intake";

export type RegressionDiff = {
  pixelDiffRatio: number | null;
  layoutShiftHeuristic: boolean;
  missingBaseline: boolean;
  candidatePath: string | null;
  approvedPath: string | null;
};

export function compareVisualRegression(
  release: string,
  screen: string,
  root = process.cwd(),
): { issues: DesignReviewIssue[]; diff: RegressionDiff } {
  const approvals = loadBaselineManifest(release, root);
  const approved = approvals.find((a) => a.screen === screen);
  const candidatePath = findScreenshotFile(release, screen, root);
  const approvedPath = approved?.screenshotPath ?? null;

  const diff: RegressionDiff = {
    pixelDiffRatio: null,
    layoutShiftHeuristic: false,
    missingBaseline: !approvedPath,
    candidatePath,
    approvedPath,
  };

  const issues: DesignReviewIssue[] = [];

  if (!candidatePath) {
    issues.push(
      createIssue({
        screen,
        category: "visual",
        severity: "P2",
        title: "MISSING_PHYSICAL_EVIDENCE — no candidate screenshot",
        evidence: [`artifacts/design-review/${release}/${screen}/ has no PNG`],
        recommendation: "Follow operator checklist: install APK → capture screen → upload artifact.",
        source: "baseline",
      }),
    );
    return { issues, diff };
  }

  if (!approvedPath) {
    issues.push(
      createIssue({
        screen,
        category: "visual",
        severity: "P2",
        title: "No approved baseline — regression not evaluated",
        evidence: [`Candidate exists at ${candidatePath}`, "baseline-manifest has no approved entry"],
        recommendation: "Complete review → human approve baseline before release comparison.",
        source: "baseline",
      }),
    );
    return { issues, diff };
  }

  try {
    const candidate = readFileSync(candidatePath);
    const approvedBytes = readFileSync(approvedPath);
    diff.pixelDiffRatio = estimateByteDiffRatio(candidate, approvedBytes);
    diff.layoutShiftHeuristic = diff.pixelDiffRatio > 0.08;

    if (diff.layoutShiftHeuristic) {
      issues.push(
        createIssue({
          screen,
          category: "visual",
          severity: "P1",
          title: "Visual regression evidence — layout shift vs approved baseline",
          evidence: [
            `pixelDiffRatio=${(diff.pixelDiffRatio * 100).toFixed(2)}% (byte heuristic, not verdict)`,
            `approved=${approvedPath}`,
            `candidate=${candidatePath}`,
          ],
          recommendation: "Review diff manually. If intentional, run baseline approval workflow.",
          source: "baseline",
        }),
      );
    }
  } catch (err) {
    issues.push(
      createIssue({
        screen,
        category: "visual",
        severity: "P1",
        title: "Baseline comparison failed to read files",
        evidence: [String(err)],
        recommendation: "Verify approved and candidate PNG paths exist and are readable.",
        source: "baseline",
      }),
    );
  }

  return { issues, diff };
}

function estimateByteDiffRatio(a: Buffer, b: Buffer): number {
  const len = Math.max(a.length, b.length, 1);
  const hashA = createHash("sha256").update(a).digest("hex");
  const hashB = createHash("sha256").update(b).digest("hex");
  if (hashA === hashB) return 0;
  return Math.min(1, Math.abs(a.length - b.length) / len + 0.05);
}

export function requiresHumanBaselineApproval(screen: string, release: string, root = process.cwd()): boolean {
  const approvals = loadBaselineManifest(release, root);
  return !approvals.some((a) => a.screen === screen);
}
