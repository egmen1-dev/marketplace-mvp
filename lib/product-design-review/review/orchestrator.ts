import { deriveConfidence } from "../evidence/confidence";
import { createIssue } from "../review/fix-loop";
import { buildVersionContext } from "../review/versioning";
import { deriveScreenVerdict } from "../rules/gate-policy";
import { computeAdvisoryScores } from "../scoring/advisory-scores";
import { getScreenDefinition } from "../screens/registry";
import { auditScreenSources } from "../static/design-system-audit";
import { detectCrudV2ForScreen } from "../crud/crud-detection-v2";
import { reviewCommerceScreen, reviewAttentionHierarchy } from "../commerce/commerce-reviewer";
import { reviewConversion } from "../conversion/conversion-reviewer";
import { reviewTrust } from "../trust/trust-reviewer";
import { reviewAccessibility } from "../accessibility/static-accessibility";
import { reviewNavigation } from "../navigation/navigation-reviewer";
import { reviewLoadingEmptyError } from "../states/loading-empty-error";
import { reviewPerformanceStatic } from "../performance/static-performance";
import { compareVisualRegression } from "../regression/compare";
import {
  findScreenshotFile,
  loadScreenshotMetadata,
} from "../screenshot/intake";
import { HeuristicVisualReviewProvider } from "../screenshot/visual-provider";
import type { DesignReviewIssue, DesignReviewResult } from "../types";

export type ReviewScreenOptions = {
  screen: string;
  release: string;
  root?: string;
  includeScreenshot?: boolean;
  includeRegression?: boolean;
};

function dedupeIssuesList(issues: DesignReviewIssue[]): DesignReviewIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.id)) return false;
    seen.add(issue.id);
    return true;
  });
}

export async function reviewScreen(options: ReviewScreenOptions): Promise<DesignReviewResult> {
  const root = options.root ?? process.cwd();
  const def = getScreenDefinition(options.screen);
  if (!def) {
    const issue = createIssue({
      screen: options.screen,
      category: "consistency",
      severity: "P0",
      title: "Unknown screen id in design review registry",
      evidence: [`Screen ${options.screen} not registered`],
      recommendation: "Add screen to lib/product-design-review/screens/registry.ts",
      source: "static",
    });
    return buildResult(options.screen, [issue], null, null);
  }

  let issues: DesignReviewIssue[] = [];
  issues.push(...auditScreenSources(def.id, def.sourceFiles, root));
  issues.push(...detectCrudV2ForScreen(def.id, def.sourceFiles, root));
  issues.push(...reviewCommerceScreen(def.id, def.sourceFiles, root));
  issues.push(...reviewAttentionHierarchy(def.id, def.sourceFiles, root));
  issues.push(...reviewConversion(def.id, def.sourceFiles, root));
  issues.push(...reviewTrust(def.id, def.sourceFiles, root));
  issues.push(...reviewAccessibility(def.id, def.sourceFiles, root));
  issues.push(...reviewNavigation(def.id, def.sourceFiles, root));
  issues.push(...reviewLoadingEmptyError(def.id, def.sourceFiles, root));
  issues.push(...reviewPerformanceStatic(def.id, def.sourceFiles, root));

  let providerVersion: string | null = null;
  const screenshotPath = findScreenshotFile(options.release, def.id, root);
  const metadata = loadScreenshotMetadata(options.release, def.id, root);

  if (options.includeScreenshot !== false) {
    if (!screenshotPath || !metadata) {
      issues.push(
        createIssue({
          screen: def.id,
          category: "visual",
          severity: def.requiresPhysicalEvidence ? "P1" : "P2",
          title: "MISSING_PHYSICAL_EVIDENCE — screenshot review skipped",
          evidence: [
            `Expected artifacts/design-review/${options.release}/${def.id}/`,
            screenshotPath ? "metadata.json missing" : "screenshot PNG missing",
          ],
          recommendation: "Capture physical Android screenshot and metadata before claiming visual PASS.",
          source: "screenshot",
        }),
      );
    } else {
      const provider = new HeuristicVisualReviewProvider();
      providerVersion = provider.providerVersion;
      const visual = await provider.review({
        screen: def.id,
        screenshotPath,
        metadata,
        screenKind: def.journey === "seller" ? "seller" : def.journey === "buyer" ? "buyer" : "shared",
      });
      issues.push(...visual.issues);
    }
  }

  if (options.includeRegression !== false) {
    const regression = compareVisualRegression(options.release, def.id, root);
    issues.push(...regression.issues);
  }

  issues = dedupeIssuesList(issues);
  return buildResult(def.id, issues, providerVersion, options.release);
}

function buildResult(
  screen: string,
  issues: DesignReviewIssue[],
  providerVersion: string | null,
  release: string | null,
): DesignReviewResult {
  const version = buildVersionContext(release, providerVersion);
  return {
    screen,
    verdict: deriveScreenVerdict(issues),
    confidence: deriveConfidence(issues),
    scores: computeAdvisoryScores(issues),
    issues,
    reviewedAt: new Date().toISOString(),
    reviewRulesVersion: version.reviewRulesVersion,
    designSystemVersion: version.designSystemVersion,
    baselineVersion: version.baselineVersion,
    providerVersion: version.providerVersion,
  };
}

export async function reviewScreens(
  screenIds: string[],
  release: string,
  root = process.cwd(),
): Promise<DesignReviewResult[]> {
  const results: DesignReviewResult[] = [];
  for (const screen of screenIds) {
    results.push(await reviewScreen({ screen, release, root }));
  }
  return results;
}

export async function reviewAllScreens(release: string, root = process.cwd()): Promise<DesignReviewResult[]> {
  const { ALL_DESIGN_REVIEW_SCREENS } = await import("../screens/registry");
  return reviewScreens(
    ALL_DESIGN_REVIEW_SCREENS.map((s) => s.id),
    release,
    root,
  );
}
