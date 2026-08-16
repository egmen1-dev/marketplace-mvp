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

export function buildAppShellReadinessReport(): AppShellReadinessReport {
  const mobile = runReleaseReadinessCheck();
  const auth = buildMobileAuthDecisionReport();
  const navLinksValid = validateNavigationDeepLinks();

  const blockers: string[] = [...auth.blockers];
  if (!navLinksValid) blockers.push("navigation_deep_link_mismatch");

  const requiredChecks = [
    "mobile_bootstrap_api",
    "mobile_config_api",
    "deep_links",
    "android_update_contract",
    "app_compatibility",
  ];
  const missing = mobile.checks.filter((c) => requiredChecks.includes(c.id) && !c.ok).map((c) => c.id);
  blockers.push(...missing);

  const readyContracts = [
    "bootstrap",
    "config",
    "deep_links",
    "navigation_manifest",
    "android_update",
    "app_compatibility",
  ];

  let status: AppShellReadinessStatus = "NO";
  if (mobile.passed >= mobile.total - 2 && navLinksValid && auth.decision === "A") {
    status = auth.nativeAppReady === "PARTIAL" || blockers.length > 0 ? "PARTIAL" : "YES";
  }

  return {
    status,
    score: `${mobile.passed}/${mobile.total}`,
    blockers,
    readyContracts,
    evaluatedAt: new Date().toISOString(),
  };
}
