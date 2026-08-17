import { secureStoreDelete, secureStoreGet, secureStoreSet } from "../storage/lazy-secure-store";

import { bootMark } from "./early-boot";
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
    await secureStoreSet(LAST_BOOT_REPORT_KEY, JSON.stringify(report));
    if (report.failure) {
      await secureStoreSet(LAST_BOOT_ERROR_KEY, JSON.stringify(report.failure));
    } else {
      await secureStoreDelete(LAST_BOOT_ERROR_KEY);
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
  await secureStoreSet(BOOT_HISTORY_KEY, JSON.stringify(next));
}

export async function loadLastStartupReport(): Promise<StartupReport | null> {
  try {
    const raw = await secureStoreGet(LAST_BOOT_REPORT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StartupReport;
  } catch {
    return null;
  }
}

export async function loadLastBootFailure(): Promise<BootFailure | null> {
  try {
    const raw = await secureStoreGet(LAST_BOOT_ERROR_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BootFailure;
  } catch {
    return null;
  }
}

export async function loadBootHistory(): Promise<BootHistoryEntry[]> {
  try {
    const raw = await secureStoreGet(BOOT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BootHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export async function saveRemoteConfigCache(config: Record<string, unknown>): Promise<void> {
  try {
    await secureStoreSet(REMOTE_CONFIG_CACHE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export async function loadRemoteConfigCache(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await secureStoreGet(REMOTE_CONFIG_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const DEFAULT_REMOTE_CONFIG: Record<string, unknown> = {};

bootMark("boot-storage module evaluated");
