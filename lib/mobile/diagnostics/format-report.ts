import { BOOT_STAGE_LABELS, BootStage, type BootFailure, type StartupReport } from "../boot/types";
import type { BootHistoryEntry, ConnectivityCheckResult, DiagnosticsReport } from "./types";
import { redactSecrets, sanitizeErrorMessage, sanitizeStack } from "./security";

function formatLocalTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDiagnosticsText(report: DiagnosticsReport): string {
  const lines = [
    "LOT Diagnostics",
    "",
    "Boot ID:",
    report.bootId,
    "",
    "Version:",
    report.app.version,
    "",
    "Version Code:",
    String(report.app.versionCode),
    "",
    "Commit:",
    report.app.commit,
    "",
    "Environment:",
    report.app.environment,
    "",
    "Stage:",
    report.boot.stage,
    "",
    "Error:",
    sanitizeErrorMessage(report.error.message),
    report.error.httpStatus ? `\nHTTP:\n${report.error.httpStatus}` : "",
    "",
    "Duration:",
    `${report.boot.durationMs} ms`,
    "",
    "Retry:",
    String(report.boot.retryCount),
    "",
    "Device:",
    `${report.device.manufacturer} ${report.device.model}`.trim(),
    "",
    "Android:",
    report.device.androidVersion,
    "",
    "Network:",
    report.network.type,
    "",
    "Time:",
    formatLocalTime(report.time),
  ];

  if (report.connectivity) {
    lines.push("", "Connectivity:", "");
    lines.push(`Internet\n${report.connectivity.internet.ok ? "✓" : "✗"}`);
    lines.push(`API\n${report.connectivity.api.ok ? "✓" : "✗"}`);
    lines.push(`Railway\n${report.connectivity.railway.ok ? "✓" : "✗"}`);
    if (report.connectivity.latencyMs !== undefined) {
      lines.push("", "Latency", `${report.connectivity.latencyMs} ms`);
    }
  }

  return lines.filter((line) => line !== "").join("\n");
}

export function formatDiagnosticsJson(report: DiagnosticsReport): string {
  const safe = {
    ...report,
    error: {
      ...report.error,
      message: sanitizeErrorMessage(report.error.message),
      stack: sanitizeStack(report.error.stack),
    },
  };
  return JSON.stringify(safe, null, 2);
}

export function formatBootTimeline(report: StartupReport | null): string {
  if (!report || report.stages.length === 0) {
    return "BOOT\n\n(no timeline)";
  }

  const lines: string[] = ["BOOT", `✓ ${Math.max(report.durationMs > 0 ? 12 : 0, 1)} ms`, "↓"];

  for (const stage of report.stages) {
    const label = BOOT_STAGE_LABELS[stage.stage].toUpperCase();
    lines.push("", label);
    if (stage.status === "failed") {
      lines.push("✗");
      if (stage.httpStatus) lines.push(`HTTP ${stage.httpStatus}`);
      else if (stage.message) lines.push(stage.message);
      lines.push("", "STOP");
      break;
    }
    const icon = stage.status === "recovered" || stage.status === "skipped" ? "~" : "✓";
    lines.push(`${icon} ${stage.durationMs} ms`);
    lines.push("↓");
  }

  if (lines[lines.length - 1] === "↓") {
    lines.pop();
    lines.push("", report.success ? "DONE" : "STOP");
  }

  return lines.join("\n");
}

export function formatHistoryEntry(entry: BootHistoryEntry): string {
  return `${formatLocalTime(entry.time)} · ${entry.bootId} · ${entry.success ? "OK" : "FAIL"} · ${entry.durationMs}ms${entry.reason ? ` · ${entry.reason}` : ""}`;
}

export function failureToDiagnosticsError(failure: BootFailure) {
  return {
    code: failure.code,
    message: sanitizeErrorMessage(failure.message),
    httpStatus: failure.httpStatus,
    stack: sanitizeStack(failure.stack),
  };
}

export function stageLabel(stage: BootStage | string): string {
  if (stage in BOOT_STAGE_LABELS) return BOOT_STAGE_LABELS[stage as BootStage];
  return String(stage);
}

export { redactSecrets };
