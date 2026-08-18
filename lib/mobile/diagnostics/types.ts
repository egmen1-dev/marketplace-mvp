import type { BootFailure } from "../boot/types";

export interface DiagnosticsAppInfo {
  version: string;
  versionCode: number;
  commit: string;
  environment: string;
  packageName?: string;
  buildDate?: string;
}

export interface DiagnosticsDeviceInfo {
  manufacturer: string;
  model: string;
  androidVersion: string;
  sdk: number;
  locale: string;
  screen?: string;
}

export interface DiagnosticsNetworkInfo {
  type: string;
  reachable: boolean;
  latencyMs?: number;
  apiOk?: boolean;
  dnsOk?: boolean;
}

export interface DiagnosticsBootInfo {
  bootId: string;
  stage: string;
  durationMs: number;
  retryCount: number;
}

export interface DiagnosticsErrorInfo {
  code: string;
  message: string;
  httpStatus?: number;
  stack?: string;
}

export interface DiagnosticsReport {
  bootId: string;
  app: DiagnosticsAppInfo;
  device: DiagnosticsDeviceInfo;
  network: DiagnosticsNetworkInfo;
  boot: DiagnosticsBootInfo;
  error: DiagnosticsErrorInfo;
  time: string;
  startupReport?: unknown;
  connectivity?: ConnectivityCheckResult;
}

export interface BootHistoryEntry {
  bootId: string;
  time: string;
  success: boolean;
  reason?: string;
  version: string;
  durationMs: number;
  retryCount: number;
}

export interface ConnectivityCheckResult {
  internet: { ok: boolean; label: string };
  api: { ok: boolean; label: string };
  railway: { ok: boolean; label: string };
  dns: { ok: boolean; label: string };
  latencyMs?: number;
}

export type BootFailurePresentation = {
  title: string;
  subtitle: string;
  category: "offline" | "server" | "timeout" | "generic";
};

export function getBootFailurePresentation(failure: BootFailure): BootFailurePresentation {
  if (failure.code.includes("network") || failure.message.toLowerCase().includes("network unavailable")) {
    return {
      title: "Нет подключения к Интернету",
      subtitle: "Проверьте соединение",
      category: "offline",
    };
  }
  if (failure.httpStatus && failure.httpStatus >= 500) {
    return {
      title: "Сервис временно недоступен",
      subtitle: "Попробуйте позже",
      category: "server",
    };
  }
  if (failure.code.includes("timeout") || failure.message.toLowerCase().includes("timeout")) {
    return {
      title: "Превышено время ожидания",
      subtitle: failure.message,
      category: "timeout",
    };
  }
  return {
    title: "Ошибка запуска",
    subtitle: failure.message,
    category: "generic",
  };
}
