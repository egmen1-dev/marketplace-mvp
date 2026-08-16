import * as SecureStore from "expo-secure-store";

import type { BootFailure, StartupReport } from "./boot-types";
import type { BootHistoryEntry } from "../../../../lib/mobile/diagnostics/types";
import { loadAppConfig } from "../config/env";

const LAST_BOOT_REPORT_KEY = "lot_last_boot_report";
const LAST_BOOT_ERROR_KEY = "lot_last_boot_error";
const REMOTE_CONFIG_CACHE_KEY = "lot_remote_config_cache";
const BOOT_HISTORY_KEY = "lot_boot_history_v1";
const MAX_HISTORY = 10;

export async function saveStartupReport(report: StartupReport): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_BOOT_REPORT_KEY, JSON.stringify(report));
    if (report.failure) {
      await SecureStore.setItemAsync(LAST_BOOT_ERROR_KEY, JSON.stringify(report.failure));
    } else {
      await SecureStore.deleteItemAsync(LAST_BOOT_ERROR_KEY);
    }
    await appendBootHistory(report);
  } catch {
    // diagnostics persistence must never block boot
  }
}

async function appendBootHistory(report: StartupReport): Promise<void> {
  const config = loadAppConfig();
  const entry: BootHistoryEntry = {
    bootId: report.bootId ?? "BOOT-000000",
    time: report.finishedAt,
    success: report.success,
    reason: report.failure?.code ?? report.failure?.message,
    version: config.appVersion,
    durationMs: report.durationMs,
    retryCount: report.retryCount ?? 0,
  };

  const history = await loadBootHistory();
  const next = [entry, ...history.filter((h) => h.bootId !== entry.bootId)].slice(0, MAX_HISTORY);
  await SecureStore.setItemAsync(BOOT_HISTORY_KEY, JSON.stringify(next));
}

export async function loadLastStartupReport(): Promise<StartupReport | null> {
  try {
    const raw = await SecureStore.getItemAsync(LAST_BOOT_REPORT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StartupReport;
  } catch {
    return null;
  }
}

export async function loadLastBootFailure(): Promise<BootFailure | null> {
  try {
    const raw = await SecureStore.getItemAsync(LAST_BOOT_ERROR_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BootFailure;
  } catch {
    return null;
  }
}

export async function loadBootHistory(): Promise<BootHistoryEntry[]> {
  try {
    const raw = await SecureStore.getItemAsync(BOOT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BootHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export async function saveRemoteConfigCache(config: Record<string, unknown>): Promise<void> {
  try {
    await SecureStore.setItemAsync(REMOTE_CONFIG_CACHE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export async function loadRemoteConfigCache(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await SecureStore.getItemAsync(REMOTE_CONFIG_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const DEFAULT_REMOTE_CONFIG: Record<string, unknown> = {};
