import type { BootFailure, StartupReport } from "../boot/boot-types";
import { BOOT_STAGE_LABELS } from "../boot/boot-types";
import { failureToDiagnosticsError, formatDiagnosticsJson, formatDiagnosticsText, stageLabel } from "../../../../lib/mobile/diagnostics/format-report";
import type { DiagnosticsReport } from "../../../../lib/mobile/diagnostics/types";
import { collectAppInfo, collectDeviceInfo } from "./device-info";
import { getNetworkSummary, runConnectivityCheck } from "./connectivity-check";

export async function buildDiagnosticsReport(input: {
  bootId: string;
  retryCount: number;
  failure: BootFailure;
  startupReport?: StartupReport | null;
  includeConnectivity?: boolean;
}): Promise<DiagnosticsReport> {
  const app = collectAppInfo();
  const device = collectDeviceInfo();
  const networkSummary = await getNetworkSummary();
  const connectivity = input.includeConnectivity ? await runConnectivityCheck() : undefined;

  return {
    bootId: input.bootId,
    app,
    device,
    network: {
      type: networkSummary.type,
      reachable: networkSummary.reachable,
      latencyMs: connectivity?.latencyMs,
      apiOk: connectivity?.api.ok,
      dnsOk: connectivity?.dns.ok,
    },
    boot: {
      bootId: input.bootId,
      stage: stageLabel(input.failure.stage),
      durationMs: input.failure.durationMs,
      retryCount: input.retryCount,
    },
    error: failureToDiagnosticsError(input.failure),
    time: new Date().toISOString(),
    startupReport: input.startupReport ?? undefined,
    connectivity,
  };
}

export async function buildDiagnosticsText(report: DiagnosticsReport): Promise<string> {
  return formatDiagnosticsText(report);
}

export function buildDiagnosticsJson(report: DiagnosticsReport): string {
  return formatDiagnosticsJson(report);
}

export function bootStageDisplayName(stage: BootFailure["stage"]): string {
  return BOOT_STAGE_LABELS[stage];
}
