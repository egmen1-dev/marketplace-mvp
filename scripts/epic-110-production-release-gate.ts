#!/usr/bin/env tsx
/**
 * EPIC-110 — Main branch promotion & production release gate.
 * Evidence only. Exits 1 when NOT_READY.
 */
import {
  PromotionExecutor,
  PromotionPlanner,
  PromotionReporter,
  PromotionRollback,
  PromotionValidator,
} from "@/lib/release/promotion";

async function main() {
  const reporter = new PromotionReporter();
  const planner = new PromotionPlanner();
  const executor = new PromotionExecutor();
  const validator = new PromotionValidator();
  const rollback = new PromotionRollback();

  const stackReport = planner.plan();
  reporter.writeReleasePrStack(stackReport);

  const execution = executor.execute(stackReport.stack, { dryRun: true });

  const sha = await validator.verifyShaQuartetAsync();
  const routes = await validator.verifyRoutes();
  reporter.writeRailwayRouteReport(routes);

  const deploymentDiff = await validator.buildDeploymentDiff();
  reporter.writeDeploymentDiff(deploymentDiff);

  const evidence = await validator.buildReleaseEvidence();
  reporter.writeReleaseEvidence(evidence);

  const rollbackReport = await rollback.assess();
  reporter.writeRollbackReport(rollbackReport);

  const reasons: string[] = [];
  const checks: Record<string, string> = {
    gitStack: stackReport.verdict,
    stackLinear: stackReport.linear ? "PASS" : "FAIL",
    allPrsMerged: stackReport.stack.every((s) => s.merged) ? "PASS" : "FAIL",
    noDraftBlockers: stackReport.stack.every((s) => !s.isDraft || s.merged) ? "PASS" : "FAIL",
    shaQuartet: sha.verdict,
    railwayRoutes: routes.every((r) => r.verdict === "PASS" || r.verdict === "SKIP") ? "PASS" : "FAIL",
    deploymentDiff: deploymentDiff.verdict,
    health: evidence.health.verdict,
    betaReadiness: evidence.betaReadiness.verdict,
    checkoutRoute:
      routes.find((r) => r.id === "checkout_web_url")?.verdict === "PASS" ||
      routes.find((r) => r.id === "checkout_web_url")?.verdict === "SKIP"
        ? "PASS"
        : "FAIL",
    dashboardRoute:
      routes.find((r) => r.id === "beta_dashboard")?.verdict === "PASS" ||
      routes.find((r) => r.id === "beta_dashboard")?.verdict === "SKIP"
        ? "PASS"
        : "FAIL",
    rollbackReadiness: rollbackReport.verdict,
  };

  if (checks.allPrsMerged !== "PASS") reasons.push("PR stack not fully merged to main");
  if (checks.noDraftBlockers !== "PASS") reasons.push("Draft PRs remain in promotion stack");
  if (checks.shaQuartet !== "PASS") {
    reasons.push(`SHA mismatch: HEAD=${sha.head} main=${sha.localMain} origin=${sha.originMain} railway=${sha.railway}`);
  }
  if (checks.railwayRoutes !== "PASS") reasons.push("Critical Railway routes failed");
  if (checks.betaReadiness !== "PASS") reasons.push("Beta readiness endpoint not HTTP 200");
  if (stackReport.missingParents.length > 0) reasons.push(...stackReport.missingParents);
  if (stackReport.gaps.length > 0) reasons.push(...stackReport.gaps);

  const ready = Object.values(checks).every((v) => v === "PASS") && reasons.length === 0;
  const verdict = ready ? "READY_FOR_CLOSED_BETA" : "NOT_READY";

  const productionGate = {
    generatedAt: new Date().toISOString(),
    execution,
    checks,
    verdict,
    reasons,
  };

  reporter.writeProductionGate(productionGate);
  reporter.writeFinalVerdict(productionGate);

  console.log(JSON.stringify({ verdict, checks, reasons, execution: execution.verdict }, null, 2));
  process.exit(ready ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
