#!/usr/bin/env tsx
/** EPIC 87 — Design Review CLI */
import { reviewAllScreens, reviewScreen } from "@/lib/product-design-review/review/orchestrator";
import {
  DEFAULT_RELEASE,
  buildDesignReviewReport,
  formatScreenReport,
  saveDesignReviewReport,
} from "@/lib/product-design-review/report/builder";

function parseArgs(argv: string[]) {
  const screenIdx = argv.indexOf("--screen");
  const releaseIdx = argv.indexOf("--release");
  return {
    screen: screenIdx >= 0 ? argv[screenIdx + 1] : null,
    release: releaseIdx >= 0 ? argv[releaseIdx + 1] ?? DEFAULT_RELEASE : DEFAULT_RELEASE,
  };
}

async function main() {
  const { screen, release } = parseArgs(process.argv.slice(2));

  if (screen) {
    const result = await reviewScreen({ screen, release });
    console.log(formatScreenReport(result));
    const report = buildDesignReviewReport([result], release);
    saveDesignReviewReport(report);
    if (result.verdict === "FAIL") process.exit(1);
    return;
  }

  const results = await reviewAllScreens(release);
  const report = buildDesignReviewReport(results, release);
  const path = saveDesignReviewReport(report);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report saved: ${path}`);
  if (report.finalVerdicts.prDesignGate === "NOT READY") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
