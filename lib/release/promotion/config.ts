/**
 * EPIC-110 — Closed Beta promotion stack (PR order on main).
 * Extend when new release-train PRs are added.
 */
export const CLOSED_BETA_PROMOTION_STACK: Array<{
  pr: number;
  epic: string;
  branch: string;
}> = [
  { pr: 124, epic: "EPIC-102", branch: "cursor/epic-102-closed-beta-program-d03e" },
  { pr: 125, epic: "EPIC-103", branch: "cursor/epic-103-closed-beta-rc-validation-d03e" },
  { pr: 126, epic: "EPIC-104", branch: "cursor/epic-104-closed-beta-readiness-d03e" },
  { pr: 127, epic: "EPIC-105", branch: "cursor/epic-105-closed-beta-launch-validation-d03e" },
  { pr: 128, epic: "EPIC-106", branch: "cursor/epic-106-staging-deployment-investigation-7513" },
  { pr: 129, epic: "EPIC-107", branch: "cursor/epic-107-merge-readiness-audit-7513" },
  { pr: 130, epic: "EPIC-108", branch: "cursor/epic-108-release-candidate-final-7513" },
  { pr: 131, epic: "EPIC-109", branch: "cursor/epic-109-release-pipeline-hardening-7513" },
];

export const RAILWAY_ROUTE_PROBE_PATHS: Array<{
  id: string;
  path: string;
  expectStatus: number | number[];
  sourcePath?: string;
  authRequired?: boolean;
}> = [
  { id: "health", path: "/api/health", expectStatus: 200 },
  { id: "version", path: "/api/version", expectStatus: 200 },
  { id: "product_ops_config", path: "/api/product-ops/config?surface=mobile&deviceId=epic110", expectStatus: 200 },
  {
    id: "beta_dashboard",
    path: "/api/product-ops/beta/dashboard",
    expectStatus: 200,
    sourcePath: "app/api/product-ops/beta/dashboard/route.ts",
  },
  {
    id: "beta_journey",
    path: "/api/product-ops/beta/journey",
    expectStatus: 200,
    sourcePath: "app/api/product-ops/beta/journey/route.ts",
  },
  {
    id: "beta_readiness",
    path: "/api/product-ops/beta/readiness",
    expectStatus: 200,
    sourcePath: "app/api/product-ops/beta/readiness/route.ts",
  },
  {
    id: "beta_performance",
    path: "/api/product-ops/beta/performance",
    expectStatus: 200,
    sourcePath: "app/api/product-ops/beta/performance/route.ts",
  },
  {
    id: "beta_crashes",
    path: "/api/product-ops/beta/crashes",
    expectStatus: 200,
    sourcePath: "app/api/product-ops/beta/crashes/route.ts",
  },
  {
    id: "beta_exit_report",
    path: "/api/product-ops/beta/exit-report",
    expectStatus: 200,
    sourcePath: "app/api/product-ops/beta/exit-report/route.ts",
  },
  {
    id: "checkout_web_url",
    path: "/api/mobile/checkout/web-url",
    expectStatus: [401, 403, 405],
    sourcePath: "app/api/mobile/checkout/web-url/route.ts",
    authRequired: true,
  },
];

export const DEFAULT_STAGING_URL = "https://web-production-e56fb.up.railway.app";
