import { postTelemetry, submitProductFeedback } from "../api/endpoints";
import { useAppStore } from "../store/app-store";
import { buildErrorReport } from "../telemetry/error-report";
import { isFlagEnabled } from "./remote-flags";
import { getBetaConfig } from "./config";
import { getBetaEnvironment } from "./environment";
import { getBuildInfo } from "./build-info";
import { getNavigationPath } from "./session-recorder";

export type CrashContext = {
  screen: string;
  errorMessage: string;
  errorStack?: string;
  kind: "js_crash" | "unhandled_promise" | "api_failure" | "navigation_failure";
};

export async function reportCrash(context: CrashContext): Promise<void> {
  if (!getBetaConfig().crashReportingEnabled) return;
  const env = getBetaEnvironment();
  const build = getBuildInfo();
  const role = useAppStore.getState().userRole ?? "unknown";
  const offline = useAppStore.getState().offline;
  const report = buildErrorReport(context.screen);

  const metadata = {
    ...report,
    errorMessage: context.errorMessage.slice(0, 500),
    errorStack: context.errorStack?.slice(0, 2000),
    kind: context.kind,
    userRole: role,
    network: offline ? "offline" : "online",
    stepsBeforeCrash: getNavigationPath().join(" → "),
    buildNumber: build.buildNumber,
    channel: build.channel,
    commitSha: build.commitSha,
  };

  void postTelemetry({
    screen: context.screen,
    event: context.kind === "js_crash" ? "crash" : context.kind,
    errorCode: context.errorMessage.slice(0, 80),
    metadata: {
      ...metadata,
      evidenceSource:
        context.errorMessage === "BETA_VALIDATION_CONTROLLED_CRASH" ? "VALIDATION" : "REAL_USER",
    },
  }).catch(() => null);

  void submitProductFeedback({
    content: JSON.stringify(metadata),
    screen: context.screen,
    category: "bug_report",
    metadata: {
      ...metadata,
      evidenceSource:
        context.errorMessage === "BETA_VALIDATION_CONTROLLED_CRASH" ? "VALIDATION" : "REAL_USER",
    },
  }).catch(() => null);
}

export function reportApiFailure(screen: string, errorCode: string): void {
  void reportCrash({
    screen,
    errorMessage: errorCode,
    kind: "api_failure",
  });
}

export function reportUnhandledPromise(screen: string, reason: string): void {
  void reportCrash({
    screen,
    errorMessage: reason,
    kind: "unhandled_promise",
  });
}

/**
 * SAFE beta-only controlled crash for RC validation.
 * Requires remote flag `beta_validation_crash_test` — never enabled in production.
 */
export function triggerBetaValidationCrash(screen: string): void {
  if (!isFlagEnabled("beta_validation_crash_test")) return;
  void reportCrash({
    screen,
    errorMessage: "BETA_VALIDATION_CONTROLLED_CRASH",
    errorStack: "Epic103ValidationHarness",
    kind: "js_crash",
  });
}
