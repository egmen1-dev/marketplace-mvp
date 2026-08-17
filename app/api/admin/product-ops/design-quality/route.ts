import { NextResponse } from "next/server";

import {
  DEFAULT_RELEASE,
  buildDesignReviewReport,
  compareReleaseDesignQuality,
  loadLatestReport,
} from "@/lib/product-design-review/report/builder";
import { reviewAllScreens } from "@/lib/product-design-review/review/orchestrator";

export const dynamic = "force-dynamic";

/** EPIC 87 — Design Quality API for Product Operations */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const release = url.searchParams.get("release") ?? DEFAULT_RELEASE;
  const compare = url.searchParams.get("compare");
  const refresh = url.searchParams.get("refresh") === "1";

  let report = loadLatestReport(release);
  if (!report || refresh) {
    const results = await reviewAllScreens(release);
    report = buildDesignReviewReport(results, release);
  }

  let comparison = null;
  if (compare) {
    const previous = loadLatestReport(compare);
    if (previous) {
      comparison = compareReleaseDesignQuality(compare, release, previous.screens, report.screens);
    }
  }

  return NextResponse.json({
    currentBuild: release,
    reviewedScreens: report.screens.map((s) => ({
      screen: s.screen,
      verdict: s.verdict,
      confidence: s.confidence,
      p0: s.issues.filter((i) => i.severity === "P0").length,
      p1: s.issues.filter((i) => i.severity === "P1").length,
      p2: s.issues.filter((i) => i.severity === "P2").length,
      regressions: s.issues.filter((i) => i.source === "baseline").length,
    })),
    summary: report.summary,
    finalVerdicts: report.finalVerdicts,
    physicalBaselineCoverage: report.physicalBaselineCoverage,
    sellerSprint1: report.sellerSprint1,
    comparison,
    generatedAt: report.generatedAt,
  });
}
