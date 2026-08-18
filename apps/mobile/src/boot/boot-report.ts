export type StartupStage =
  | "app_init"
  | "api_health"
  | "bootstrap"
  | "remote_config"
  | "update_check"
  | "session_restore"
  | "navigation"
  | "boot_timeout";

export type RequestFailureKind =
  | "timeout"
  | "ssl"
  | "dns"
  | "network"
  | "http"
  | "parse"
  | "unknown";

export type StartupDiagnosticEntry = {
  ts: number;
  stage: StartupStage | string;
  event: string;
  detail?: string;
  url?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  failureKind?: RequestFailureKind;
  responseBody?: string;
};

export type StartupBootReport = {
  startedAt: number;
  finishedAt?: number;
  currentStage: string;
  failedStage?: string;
  env: {
    apiBaseUrl: string;
    releaseChannel: string;
    appVersion: string;
    buildNumber: string;
    betaChannel: string;
    commitSha: string;
  };
  entries: StartupDiagnosticEntry[];
};

export function formatBootReportSummary(report: StartupBootReport): string {
  const lines: string[] = [
    `API: ${report.env.apiBaseUrl}`,
    `Channel: ${report.env.releaseChannel} / ${report.env.betaChannel}`,
    `Build: ${report.env.appVersion} (${report.env.buildNumber})`,
    `Stage: ${report.failedStage ?? report.currentStage}`,
  ];

  const failures = report.entries.filter((e) => e.event === "request_fail" || e.event === "stage_fail");
  for (const f of failures.slice(-3)) {
    const status = f.status != null ? ` HTTP ${f.status}` : "";
    const kind = f.failureKind ? ` [${f.failureKind}]` : "";
    lines.push(`${f.stage}: ${f.detail ?? f.event}${status}${kind}`);
    if (f.url) lines.push(`  ${f.url}`);
    if (f.responseBody) lines.push(`  body: ${f.responseBody.slice(0, 120)}`);
  }

  return lines.join("\n");
}

export function formatBootReportJson(report: StartupBootReport): string {
  return JSON.stringify(report, null, 2);
}
