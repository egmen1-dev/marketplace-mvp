import * as Network from "expo-network";

import { loadAppConfig } from "../config/env";
import type { ConnectivityCheckResult } from "../../../../lib/mobile/diagnostics/types";

function labelForNetworkType(type?: Network.NetworkStateType | null): string {
  if (!type) return "unknown";
  if (type === Network.NetworkStateType.WIFI) return "Wi‑Fi";
  if (type === Network.NetworkStateType.CELLULAR) return "LTE";
  if (type === Network.NetworkStateType.ETHERNET) return "Ethernet";
  if (type === Network.NetworkStateType.NONE) return "offline";
  return String(type);
}

export async function runConnectivityCheck(timeoutMs = 5000): Promise<ConnectivityCheckResult> {
  const state = await Network.getNetworkStateAsync();
  const internetOk = Boolean(state.isConnected && state.isInternetReachable !== false);
  const networkType = labelForNetworkType(state.type);

  if (!internetOk) {
    return {
      internet: { ok: false, label: "Интернет" },
      api: { ok: false, label: "API" },
      railway: { ok: false, label: "Railway" },
      dns: { ok: false, label: "DNS" },
    };
  }

  const config = loadAppConfig();
  const url = `${config.apiBaseUrl}/api/mobile/bootstrap`;
  const started = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: "GET", signal: controller.signal, headers: { Accept: "application/json" } });
    clearTimeout(timer);
    const latencyMs = Date.now() - started;
    const apiOk = res.ok;
    const railwayOk = res.status < 500;
    return {
      internet: { ok: true, label: "Интернет" },
      api: { ok: apiOk, label: "API" },
      railway: { ok: railwayOk, label: "Railway" },
      dns: { ok: true, label: "DNS" },
      latencyMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    const dnsFail = message.includes("dns") || message.includes("host") || message.includes("resolve");
    return {
      internet: { ok: true, label: "Интернет" },
      api: { ok: false, label: "API" },
      railway: { ok: false, label: "Railway" },
      dns: { ok: !dnsFail, label: "DNS" },
    };
  }
}

export async function getNetworkSummary(): Promise<{ type: string; reachable: boolean }> {
  const state = await Network.getNetworkStateAsync();
  return {
    type: labelForNetworkType(state.type),
    reachable: Boolean(state.isConnected && state.isInternetReachable !== false),
  };
}
