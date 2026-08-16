import * as SecureStore from "expo-secure-store";

import type { BootFailure, StartupReport } from "./boot-types";

const LAST_BOOT_REPORT_KEY = "lot_last_boot_report";
const LAST_BOOT_ERROR_KEY = "lot_last_boot_error";
const REMOTE_CONFIG_CACHE_KEY = "lot_remote_config_cache";

export async function saveStartupReport(report: StartupReport): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_BOOT_REPORT_KEY, JSON.stringify(report));
    if (report.failure) {
      await SecureStore.setItemAsync(LAST_BOOT_ERROR_KEY, JSON.stringify(report.failure));
    } else {
      await SecureStore.deleteItemAsync(LAST_BOOT_ERROR_KEY);
    }
  } catch {
    // diagnostics persistence must never block boot
  }
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
