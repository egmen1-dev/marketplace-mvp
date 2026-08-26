import * as Clipboard from "expo-clipboard";

import { getBuildInfo } from "../beta/build-info";
import { getBetaEnvironment } from "../beta/environment";

export type UpdateJourneyDiagnosticEvent = {
  ts: string;
  event:
    | "UPDATE_CHECK_STARTED"
    | "UPDATE_CHECK_SUCCESS"
    | "UPDATE_CHECK_FAILED"
    | "UPDATE_AVAILABLE"
    | "UPDATE_DOWNLOAD_STARTED"
    | "UPDATE_DOWNLOAD_PROGRESS"
    | "UPDATE_DOWNLOAD_SUCCESS"
    | "UPDATE_VERIFY_STARTED"
    | "UPDATE_VERIFY_SUCCESS"
    | "UPDATE_VERIFY_FAILED"
    | "UPDATE_INSTALL_HANDOFF"
    | "UPDATE_INSTALL_HANDOFF_FAILED";
  actionId: string;
  installedCode?: number;
  latestCode?: number | null;
  httpStatus?: number;
  durationMs?: number;
  errorCode?: string | null;
  bytesDownloaded?: number;
  expectedShaPrefix?: string | null;
  actualShaPrefix?: string | null;
  finalState?: string;
};

const MAX_EVENTS = 40;
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
    "LOT update journey diagnostics",
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
        e.latestCode != null ? `latestCode=${e.latestCode}` : null,
        e.httpStatus != null ? `status=${e.httpStatus}` : null,
        e.durationMs != null ? `durationMs=${e.durationMs}` : null,
        e.errorCode ? `errorCode=${e.errorCode}` : null,
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
