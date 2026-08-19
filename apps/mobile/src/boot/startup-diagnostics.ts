import { getBuildInfo } from "../beta/build-info";
import { loadAppConfig } from "../config/env";
import {
  getCurrentBootStage as readBootStage,
  resetBootStage,
  setCurrentBootStage,
} from "./boot-stage";
import { classifyFetchFailure } from "./classify-fetch-error";
import type { StartupBootReport, StartupDiagnosticEntry, StartupStage } from "./boot-report";
import { formatBootReportJson, formatBootReportSummary } from "./boot-report";

export type { StartupBootReport, StartupDiagnosticEntry, StartupStage } from "./boot-report";
export { formatBootReportJson, formatBootReportSummary };
export { getCurrentBootStage, setCurrentBootStage } from "./boot-stage";

const MAX_ENTRIES = 200;
const entries: StartupDiagnosticEntry[] = [];
let bootStartedAt = 0;
let failedStage: string | undefined;

export function isStartupVerbose(): boolean {
  return (
    __DEV__ ||
    process.env.EXPO_PUBLIC_STARTUP_VERBOSE === "true" ||
    process.env.EXPO_PUBLIC_STARTUP_VERBOSE === "1"
  );
}

export function resetStartupDiagnostics(): void {
  entries.length = 0;
  bootStartedAt = Date.now();
  resetBootStage();
  failedStage = undefined;
}

function push(entry: Omit<StartupDiagnosticEntry, "ts">): void {
  const full: StartupDiagnosticEntry = { ...entry, ts: Date.now() };
  entries.push(full);
  if (entries.length > MAX_ENTRIES) entries.shift();

  if (isStartupVerbose()) {
    const parts = [
      "[LOT:boot]",
      full.stage,
      full.event,
      full.url ?? "",
      full.status != null ? String(full.status) : "",
      full.detail ?? "",
      full.failureKind ?? "",
    ].filter(Boolean);
    console.log(parts.join(" "));
  }
}

export function logStartupStage(stage: StartupStage | string, event: string, detail?: string): void {
  setCurrentBootStage(stage);
  push({ stage, event, detail });
}

export function logStartupRequestStart(stage: StartupStage | string, url: string, method = "GET"): void {
  setCurrentBootStage(stage);
  push({ stage, event: "request_start", url, method });
}

export function logStartupRequestOk(
  stage: StartupStage | string,
  url: string,
  status: number,
  durationMs: number,
  detail?: string,
): void {
  push({ stage, event: "request_ok", url, status, durationMs, detail });
}

export function logStartupRequestFail(
  stage: StartupStage | string,
  url: string,
  err: unknown,
  durationMs: number,
  responseBody?: string,
): void {
  const classified = classifyFetchFailure(err, url);
  failedStage = stage;
  push({
    stage,
    event: "request_fail",
    url,
    durationMs,
    failureKind: classified.kind,
    status: classified.status,
    detail: classified.code ? `${classified.code}: ${classified.message}` : classified.message,
    responseBody: responseBody?.slice(0, 500),
  });
}

export function logStartupFailure(stage: StartupStage | string, err: unknown, detail?: string): void {
  const classified = classifyFetchFailure(err);
  failedStage = stage;
  push({
    stage,
    event: "stage_fail",
    failureKind: classified.kind,
    detail: detail ?? classified.message,
  });
}

export function getStartupBootReport(): StartupBootReport {
  const config = loadAppConfig();
  const build = getBuildInfo();
  return {
    startedAt: bootStartedAt || Date.now(),
    finishedAt: Date.now(),
    currentStage: readBootStage(),
    failedStage,
    env: {
      apiBaseUrl: config.apiBaseUrl,
      releaseChannel: config.releaseChannel,
      appVersion: config.appVersion,
      buildNumber: config.buildNumber,
      betaChannel: build.channel,
      commitSha: build.commitSha,
    },
    entries: [...entries],
  };
}
