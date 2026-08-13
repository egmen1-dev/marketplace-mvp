import type { LaunchAuditCheck, LaunchSeverity } from "./types";

export function launchCheck(
  id: string,
  label: string,
  passed: boolean,
  severity: LaunchSeverity = passed ? "info" : "warning",
  detail?: string,
): LaunchAuditCheck {
  return { id, label, passed, severity: passed ? "info" : severity, detail };
}

export function scoreFromLaunchChecks(checks: LaunchAuditCheck[]): number {
  if (checks.length === 0) return 100;
  const weighted = checks.map((c): number => {
    if (c.passed) return 100;
    if (c.severity === "critical") return 0;
    if (c.severity === "warning") return 40;
    return 60;
  });
  return Math.round(weighted.reduce((a, b) => a + b, 0) / weighted.length);
}

export type LaunchReadinessReportLabel = "launch_ready" | "gaps" | "blocked";

export function computeLaunchLabel(score: number): LaunchReadinessReportLabel {
  if (score >= 85) return "launch_ready";
  if (score >= 70) return "gaps";
  return "blocked";
}

export function launchHeadline(label: LaunchReadinessReportLabel): string {
  switch (label) {
    case "launch_ready":
      return "Marketplace launch ready";
    case "gaps":
      return "Launch possible with known gaps";
    default:
      return "Launch blocked — fix critical issues";
  }
}
