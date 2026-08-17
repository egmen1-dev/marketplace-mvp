import { describe, expect, it } from "vitest";

import { reviewAccessibility } from "@/lib/product-design-review/accessibility/static-accessibility";
import { buildAttentionHeuristic } from "@/lib/product-design-review/commerce/commerce-reviewer";
import { detectCrudV2ForScreen } from "@/lib/product-design-review/crud/crud-detection-v2";
import { deriveConfidence } from "@/lib/product-design-review/evidence/confidence";
import { stableIssueId } from "@/lib/product-design-review/review/fix-loop";
import { reviewScreen } from "@/lib/product-design-review/review/orchestrator";
import {
  evaluatePrDesignGate,
  deriveScreenVerdict,
  scoreDoesNotBlockGate,
} from "@/lib/product-design-review/rules/gate-policy";
import { hasCriticalAccessibilityFail } from "@/lib/product-design-review/rules/severity";
import { computeAdvisoryScores } from "@/lib/product-design-review/scoring/advisory-scores";
import { compareVisualRegression, requiresHumanBaselineApproval } from "@/lib/product-design-review/regression/compare";
import { saveBaselineApproval, loadBaselineManifest } from "@/lib/product-design-review/screenshot/intake";
import { createIssue } from "@/lib/product-design-review/review/fix-loop";
import type { DesignReviewResult } from "@/lib/product-design-review/types";

describe("EPIC 87 Design Review System", () => {
  it("computes deterministic advisory scores from issues", () => {
    const issues = [
      createIssue({
        screen: "catalog",
        category: "visual",
        severity: "P1",
        title: "Test issue",
        evidence: ["line 1"],
        recommendation: "fix",
        source: "static",
      }),
    ];
    const a = computeAdvisoryScores(issues);
    const b = computeAdvisoryScores(issues);
    expect(a).toEqual(b);
  });

  it("does not block PR gate on score delta alone", () => {
    expect(scoreDoesNotBlockGate(9.42, 9.5)).toBe(true);
  });

  it("requires evidence on every issue", async () => {
    const result = await reviewScreen({ screen: "login", release: "test-release", includeScreenshot: false });
    expect(result.issues.every((i) => i.evidence.length > 0)).toBe(true);
    expect(result.issues.every((i) => i.recommendation.length > 0)).toBe(true);
  });

  it("stable issue ids across reruns", () => {
    const a = stableIssueId({ screen: "pdp", category: "commerce", title: "Missing CTA" });
    const b = stableIssueId({ screen: "pdp", category: "commerce", title: "Missing CTA" });
    expect(a).toBe(b);
  });

  it("P0 gate blocks PR design gate", () => {
    const results: DesignReviewResult[] = [
      {
        screen: "cart",
        verdict: "FAIL",
        confidence: "LOW",
        scores: computeAdvisoryScores([]),
        issues: [
          createIssue({
            screen: "cart",
            category: "conversion",
            severity: "P0",
            title: "Missing critical CTA",
            evidence: ["no checkout button"],
            recommendation: "add CTA",
            source: "static",
          }),
        ],
        reviewedAt: new Date().toISOString(),
        reviewRulesVersion: "1.0.0",
        designSystemVersion: "1.0.0",
        baselineVersion: null,
        providerVersion: null,
      },
    ];
    const gate = evaluatePrDesignGate(results);
    expect(gate.ready).toBe(false);
    expect(gate.hardBlockers.some((b) => b.includes("P0"))).toBe(true);
  });

  it("accessibility critical fail blocks gate", () => {
    const issues = [
      createIssue({
        screen: "catalog",
        category: "accessibility",
        severity: "P0",
        title: "Icon-only buttons without accessible labels",
        evidence: ["3 icon buttons, 0 labels"],
        recommendation: "add labels",
        source: "static",
      }),
    ];
    expect(hasCriticalAccessibilityFail(issues)).toBe(true);
  });

  it("missing screenshot is not fake PASS", async () => {
    const result = await reviewScreen({ screen: "buyer_home", release: "missing-evidence-test" });
    expect(
      result.issues.some((i) => i.title.includes("MISSING_PHYSICAL_EVIDENCE")) ||
        result.confidence !== "HIGHER",
    ).toBe(true);
  });

  it("baseline approval requires human record", () => {
    const release = `baseline-test-release-${Date.now()}`;
    expect(requiresHumanBaselineApproval("login", release)).toBe(true);
    saveBaselineApproval({
      screen: "login",
      release,
      approvedAt: new Date().toISOString(),
      approvedBy: "operator@test",
      screenshotPath: "artifacts/design-review/baseline-test-release/login/screenshot.png",
      metadataPath: "artifacts/design-review/baseline-test-release/login/metadata.json",
    });
    const manifest = loadBaselineManifest(release);
    expect(manifest.some((m) => m.approvedBy === "operator@test")).toBe(true);
    expect(requiresHumanBaselineApproval("login", release)).toBe(false);
  });

  it("visual regression pixel diff is evidence not auto-verdict", () => {
    const { issues } = compareVisualRegression("missing-evidence-test", "login");
    expect(issues.some((i) => i.title.includes("MISSING_PHYSICAL_EVIDENCE") || i.title.includes("baseline"))).toBe(true);
  });

  it("derives screen verdict from severities not scores", () => {
    expect(deriveScreenVerdict([])).toBe("PASS");
    expect(
      deriveScreenVerdict([
        createIssue({
          screen: "x",
          category: "visual",
          severity: "P1",
          title: "x",
          evidence: ["e"],
          recommendation: "r",
          source: "static",
        }),
      ]),
    ).toBe("WATCH");
  });

  it("confidence LOW for static-only review", async () => {
    const result = await reviewScreen({ screen: "login", release: "static-only", includeScreenshot: false, includeRegression: false });
    expect(["LOW", "MEDIUM"]).toContain(result.confidence);
  });

  it("seller/buyer rubric isolation in attention heuristic", () => {
    const buyer = buildAttentionHeuristic("catalog", ["apps/mobile/app/(tabs)/catalog.tsx"]);
    const seller = buildAttentionHeuristic("seller_home", ["apps/mobile/app/(tabs)/seller-home.tsx"]);
    expect(buyer.primary).toContain("Product");
    expect(seller.primary).not.toBe(buyer.primary);
  });

  it("CRUD v2 explains admin table detection", () => {
    const issues = detectCrudV2ForScreen("test", ["lib/product-design-review/crud/crud-detection-v2.ts"]);
    expect(issues.every((i) => i.recommendation.length > 0)).toBe(true);
  });

  it("design quality API exports GET handler", async () => {
    const route = await import("@/app/api/admin/product-ops/design-quality/route");
    expect(typeof route.GET).toBe("function");
  });

  it("accessibility reviewer emits evidence lines", () => {
    const issues = reviewAccessibility("login", ["apps/mobile/app/login.tsx"]);
    for (const issue of issues) {
      expect(issue.evidence.length).toBeGreaterThan(0);
    }
  });

  it("deriveConfidence rises with screenshot evidence", () => {
    expect(
      deriveConfidence([
        createIssue({
          screen: "login",
          category: "visual",
          severity: "P2",
          title: "x",
          evidence: ["screenshot"],
          recommendation: "r",
          source: "screenshot",
        }),
      ]),
    ).toBe("HIGHER");
  });
});
