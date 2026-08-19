import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type {
  DeploymentDiffReport,
  ProductionGateReport,
  ReleaseEvidence,
  ReleasePrStackReport,
  RollbackReport,
  RouteProbeResult,
} from "./types";

const DEFAULT_OUT = join(process.cwd(), "artifacts/epic-110");

export class PromotionReporter {
  constructor(private outDir = DEFAULT_OUT) {
    mkdirSync(this.outDir, { recursive: true });
  }

  writeReleasePrStack(report: ReleasePrStackReport) {
    writeFileSync(join(this.outDir, "release-pr-stack.json"), JSON.stringify(report, null, 2));
  }

  writeRailwayRouteReport(routes: RouteProbeResult[]) {
    writeFileSync(
      join(this.outDir, "railway-route-report.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          routes,
          verdict: routes.every((r) => r.verdict === "PASS" || r.verdict === "SKIP") ? "PASS" : "FAIL",
        },
        null,
        2,
      ),
    );
  }

  writeDeploymentDiff(diff: DeploymentDiffReport) {
    writeFileSync(join(this.outDir, "deployment-diff.json"), JSON.stringify(diff, null, 2));
  }

  writeReleaseEvidence(evidence: ReleaseEvidence) {
    writeFileSync(join(this.outDir, "release-evidence.json"), JSON.stringify(evidence, null, 2));
  }

  writeRollbackReport(report: RollbackReport) {
    writeFileSync(join(this.outDir, "rollback-report.json"), JSON.stringify(report, null, 2));
  }

  writeProductionGate(report: ProductionGateReport) {
    writeFileSync(join(this.outDir, "production-gate.json"), JSON.stringify(report, null, 2));
  }

  writeFinalVerdict(report: ProductionGateReport) {
    writeFileSync(join(this.outDir, "final-verdict.json"), JSON.stringify(report, null, 2));
  }
}
