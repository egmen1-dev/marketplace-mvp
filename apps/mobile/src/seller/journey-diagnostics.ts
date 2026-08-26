import * as Clipboard from "expo-clipboard";

import { getBetaEnvironment } from "../beta/environment";
import { getBuildInfo } from "../beta/build-info";

export type SellerJourneyDiagnosticEvent = {
  ts: string;
  screen: string;
  action: string;
  actionId: string;
  productId?: string | null;
  clientState?: string;
  httpRoute?: string;
  httpStatus?: number;
  durationMs?: number;
  outcome?: "SUCCESS" | "VISIBLE_ERROR" | "IN_FLIGHT";
  errorCode?: string | null;
};

const MAX_EVENTS = 40;
const events: SellerJourneyDiagnosticEvent[] = [];

export function recordSellerJourneyEvent(
  event: Omit<SellerJourneyDiagnosticEvent, "ts"> & { ts?: string },
): void {
  if (!getBetaEnvironment().isBeta) return;
  events.push({ ts: event.ts ?? new Date().toISOString(), ...event });
  while (events.length > MAX_EVENTS) events.shift();
}

export function getSellerJourneyDiagnostics(): SellerJourneyDiagnosticEvent[] {
  return [...events];
}

export function formatSellerJourneyDiagnostics(): string {
  const build = getBuildInfo();
  const env = getBetaEnvironment();
  const lines = [
    "LOT seller journey diagnostics",
    `version=${build.appVersion} code=${build.buildNumber}`,
    `channel=${env.channel} env=${build.environment}`,
    `commit=${build.commitSha}`,
    `api=${build.apiBaseUrl}`,
    "",
    ...events.map((e) =>
      [
        e.ts,
        `screen=${e.screen}`,
        `action=${e.action}`,
        `actionId=${e.actionId}`,
        e.productId ? `productId=${e.productId}` : null,
        e.clientState ? `clientState=${e.clientState}` : null,
        e.httpRoute ? `route=${e.httpRoute}` : null,
        e.httpStatus != null ? `status=${e.httpStatus}` : null,
        e.durationMs != null ? `durationMs=${e.durationMs}` : null,
        e.outcome ? `outcome=${e.outcome}` : null,
        e.errorCode ? `errorCode=${e.errorCode}` : null,
      ]
        .filter(Boolean)
        .join(" "),
    ),
  ];
  return lines.join("\n");
}

export async function copySellerJourneyDiagnostics(): Promise<string> {
  const text = formatSellerJourneyDiagnostics();
  await Clipboard.setStringAsync(text);
  return text;
}

export function clearSellerJourneyDiagnosticsForTests(): void {
  events.length = 0;
}
