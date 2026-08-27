import * as Clipboard from "expo-clipboard";

import { getBuildInfo } from "../beta/build-info";
import { getBetaEnvironment } from "../beta/environment";

export type UpdateJourneyDiagnosticEvent = {
  ts: string;
  event:
    | "UPDATE_CTA_PRESS"
    | "UPDATE_CHECK_STARTED"
    | "UPDATE_CHECK_SUCCESS"
    | "UPDATE_CHECK_FAILED"
    | "UPDATE_AVAILABLE"
    | "CACHE_CHECK_STARTED"
    | "CACHE_MISS"
    | "CACHE_FOUND"
    | "CACHE_VERIFY_STARTED"
    | "CACHE_VALID"
    | "CACHE_INVALID"
    | "DOWNLOAD_PREPARING"
    | "DOWNLOAD_HTTP_STARTED"
    | "DOWNLOAD_PROGRESS"
    | "DOWNLOAD_HTTP_COMPLETE"
    | "SHA_VERIFY_STARTED"
    | "SHA_VERIFY_COMPLETE"
    | "SHA_VERIFY_FAILED"
    | "INSTALLER_PREPARING"
    | "INSTALL_PERMISSION_REQUIRED"
    | "INSTALLER_INTENT_STARTED"
    | "INSTALLER_INTENT_OPENED"
    | "INSTALLER_INTENT_FAILED"
    | "UPDATE_FLOW_FAILED"
    | "UPDATE_DOWNLOAD_STARTED"
    | "UPDATE_DOWNLOAD_SUCCESS"
    | "UPDATE_VERIFY_STARTED"
    | "UPDATE_VERIFY_SUCCESS"
    | "UPDATE_VERIFY_FAILED"
    | "UPDATE_INSTALL_HANDOFF"
    | "UPDATE_INSTALL_HANDOFF_FAILED";
  actionId: string;
  installedCode?: number;
  targetCode?: number;
  latestCode?: number | null;
  stage?: string;
  httpStatus?: number;
  durationMs?: number;
  errorCode?: string | null;
  errorClass?: string | null;
  bytesDownloaded?: number;
  expectedShaPrefix?: string | null;
  actualShaPrefix?: string | null;
  finalState?: string;
};

const MAX_EVENTS = 60;
const events: UpdateJourneyDiagnosticEvent[] = [];

export function createUpdateActionId(prefix = "update"): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function recordUpdateJourneyEvent(
  event: Omit<UpdateJourneyDiagnosticEvent, "ts"> & { ts?: string },
): void {
  if (!getBetaEnvironment().isBeta) return;
  events.push({ ts: event.ts ?? new Date().toISOString(), ...event });
  while (events.length > MAX_EVENTS) events.shift();
}

export function getUpdateJourneyDiagnostics(): UpdateJourneyDiagnosticEvent[] {
  return [...events];
}

export function formatUpdateJourneyDiagnostics(): string {
  const build = getBuildInfo();
  const env = getBetaEnvironment();
  const lines = [
    "LOT update journey diagnostics (V2)",
    `version=${build.appVersion} code=${build.buildNumber}`,
    `channel=${env.channel} env=${build.environment}`,
    `commit=${build.commitSha}`,
    "",
    ...events.map((e) =>
      [
        e.ts,
        `event=${e.event}`,
        `actionId=${e.actionId}`,
        e.installedCode != null ? `installedCode=${e.installedCode}` : null,
        e.targetCode != null ? `targetCode=${e.targetCode}` : null,
        e.latestCode != null ? `latestCode=${e.latestCode}` : null,
        e.stage ? `stage=${e.stage}` : null,
        e.httpStatus != null ? `status=${e.httpStatus}` : null,
        e.durationMs != null ? `durationMs=${e.durationMs}` : null,
        e.errorCode ? `errorCode=${e.errorCode}` : null,
        e.errorClass ? `errorClass=${e.errorClass}` : null,
        e.bytesDownloaded != null ? `bytes=${e.bytesDownloaded}` : null,
        e.expectedShaPrefix ? `expectedSha=${e.expectedShaPrefix}` : null,
        e.actualShaPrefix ? `actualSha=${e.actualShaPrefix}` : null,
        e.finalState ? `finalState=${e.finalState}` : null,
      ]
        .filter(Boolean)
        .join(" "),
    ),
  ];
  return lines.join("\n");
}

export async function copyUpdateJourneyDiagnostics(): Promise<string> {
  const text = formatUpdateJourneyDiagnostics();
  await Clipboard.setStringAsync(text);
  return text;
}

export function clearUpdateJourneyDiagnosticsForTests(): void {
  events.length = 0;
}
