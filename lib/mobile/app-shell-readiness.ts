import { buildMobileAuthDecisionReport } from "./auth-decision";
import { validateNavigationDeepLinks } from "./navigation";
import { runReleaseReadinessCheck } from "./release-readiness";

export type AppShellReadinessStatus = "YES" | "PARTIAL" | "NO";

export type AppShellReadinessReport = {
  status: AppShellReadinessStatus;
  score: string;
  blockers: string[];
  readyContracts: string[];
  evaluatedAt: string;
};

const SHELL_CONTRACTS = [
  "bootstrap",
  "config",
  "navigation",
  "dashboard",
  "readiness",
  "deep_link_resolve",
  "android_update",
  "auth_session",
  "auth_refresh",
  "auth_logout",
] as const;

export function buildAppShellReadinessReport(): AppShellReadinessReport {
  const mobile = runReleaseReadinessCheck();
  const auth = buildMobileAuthDecisionReport();
  const navLinksValid = validateNavigationDeepLinks();

  const hardChecks = [
    "mobile_refresh_api",
    "mobile_logout_api",
    "session_support",
    "navigation_manifest",
    "deep_link_resolver",
    "bootstrap_version_fields",
    "android_update_contract",
    "offline_cache",
  ];

  const blockers: string[] = [];
  if (!auth.refreshImplemented) blockers.push("mobile_refresh_not_implemented");
  if (!navLinksValid) blockers.push("navigation_deep_link_mismatch");

  for (const id of hardChecks) {
    const check = mobile.checks.find((c) => c.id === id);
    if (check && !check.ok) blockers.push(id);
  }

  const status: AppShellReadinessStatus =
    blockers.length === 0 && mobile.ready && auth.refreshImplemented ? "YES" : "PARTIAL";

  return {
    status,
    score: `${mobile.passed}/${mobile.total}`,
    blockers,
    readyContracts: [...SHELL_CONTRACTS],
    evaluatedAt: new Date().toISOString(),
  };
}
