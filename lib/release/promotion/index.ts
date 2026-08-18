export { CLOSED_BETA_PROMOTION_STACK, DEFAULT_STAGING_URL, RAILWAY_ROUTE_PROBE_PATHS } from "./config";
export { PromotionPlanner } from "./planner";
export { PromotionExecutor } from "./executor";
export { PromotionValidator } from "./validator";
export { PromotionRollback } from "./rollback";
export { PromotionReporter } from "./reporter";
export type * from "./types";

import { PromotionPlanner } from "./planner";
import { PromotionValidator } from "./validator";

/** Snapshot for /admin/release dashboard. */
export async function getReleasePromotionDashboard() {
  const planner = new PromotionPlanner();
  const stack = planner.plan();
  const validator = new PromotionValidator();
  const sha = await validator.verifyShaQuartetAsync();
  const routes = await validator.verifyRoutes();
  const evidence = await validator.buildReleaseEvidence();

  const routesPass = routes.every((r) => r.verdict === "PASS" || r.verdict === "SKIP");
  const stackMerged = stack.stack.every((s) => s.merged);
  const ready =
    sha.allMatch &&
    routesPass &&
    stackMerged &&
    evidence.betaReadiness.verdict === "PASS" &&
    evidence.health.verdict === "PASS";

  return {
    generatedAt: new Date().toISOString(),
    currentRelease: {
      sha: sha.railway || sha.originMain,
      version: evidence.version,
      buildTime: evidence.buildTime,
      environment: evidence.environment,
    },
    previousRelease: {
      sha: stack.stack[0]?.parentSha?.slice(0, 7) ?? "unknown",
    },
    sha: {
      head: sha.head,
      localMain: sha.localMain,
      originMain: sha.originMain,
      railway: sha.railway,
      allMatch: sha.allMatch,
    },
    health: evidence.health,
    betaReadiness: evidence.betaReadiness,
    checkout: routes.find((r) => r.id === "checkout_web_url"),
    dashboard: routes.find((r) => r.id === "beta_dashboard"),
    stackSummary: {
      total: stack.stack.length,
      merged: stack.stack.filter((s) => s.merged).length,
      draft: stack.stack.filter((s) => s.isDraft).length,
      linear: stack.linear,
    },
    routes,
    readyForClosedBeta: ready,
    verdict: ready ? "READY_FOR_CLOSED_BETA" : "NOT_READY",
  };
}
