import { loadAppConfig } from "../config/env";
import type { MobileEnvelope } from "../types/api";
import { ApiClientError, parseApiError } from "./errors";
import { clearSession, getAccessToken, getDeviceId, getRefreshToken, getSessionMeta, saveTokens } from "../storage/secure-session";

export { ApiClientError, parseApiError } from "./errors";

let memoryAccessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let sessionClearedHandler: (() => void) | null = null;

const DEFINITIVE_REFRESH_FAILURE_CODES = new Set([
  "REFRESH_REVOKED",
  "REFRESH_INVALID",
  "REFRESH_REPLAY",
  "REFRESH_EXPIRED",
]);

export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

export function setSessionClearedHandler(handler: (() => void) | null): void {
  sessionClearedHandler = handler;
}

function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal =
    init.signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;
  return fetch(url, { ...init, signal });
}

export function setMemoryAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

export async function warmSessionFromStorage(): Promise<void> {
  const token = await getAccessToken();
  if (token) memoryAccessToken = token;
}

async function clearSessionAndNotify(): Promise<void> {
  await clearSession();
  memoryAccessToken = null;
  sessionClearedHandler?.();
}

async function parseError(res: Response): Promise<ApiClientError> {
  return parseApiError(res);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const config = loadAppConfig();
    const res = await fetchWithTimeout(`${config.apiBaseUrl}/api/mobile/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      const err = await parseError(res);
      if (DEFINITIVE_REFRESH_FAILURE_CODES.has(err.code)) {
        await clearSessionAndNotify();
      }
      throw err;
    }

    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      sessionId: string;
      userId?: string;
      role?: string;
    };

    const existingMeta = await getSessionMeta();
    await saveTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      meta: {
        sessionId: data.sessionId,
        userId: data.userId ?? existingMeta?.userId ?? "",
        role: data.role ?? existingMeta?.role ?? "BUYER",
      },
    });
    memoryAccessToken = data.accessToken;
    return data.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const config = loadAppConfig();
  const token = memoryAccessToken ?? (await getAccessToken());
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetchWithTimeout(`${config.apiBaseUrl}${path}`, { ...init, headers });

  if (res.status === 401 && retry) {
    const err = await parseError(res);
    if (err.code === "TOKEN_EXPIRED" || err.code === "UNAUTHORIZED" || err.message.toLowerCase().includes("token")) {
      try {
        const refreshed = await refreshAccessToken();
        if (refreshed) return apiRequest<T>(path, init, false);
      } catch (refreshErr) {
        if (refreshErr instanceof ApiClientError && DEFINITIVE_REFRESH_FAILURE_CODES.has(refreshErr.code)) {
          throw refreshErr;
        }
      }
    }
    throw err;
  }

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export async function login(input: { email: string; password: string; pendingDeepLink?: string }) {
  const config = loadAppConfig();
  const res = await fetchWithTimeout(`${config.apiBaseUrl}/api/mobile/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "login",
      email: input.email,
      password: input.password,
      deviceId: getDeviceId(),
      pendingDeepLink: input.pendingDeepLink,
    }),
  });

  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as MobileEnvelope<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    sessionId: string;
    userId: string;
    role: string;
    destination?: unknown;
  }>;

  await saveTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    meta: { sessionId: data.sessionId, userId: data.userId, role: data.role },
  });
  memoryAccessToken = data.accessToken;
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await apiRequest("/api/mobile/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // local cleanup still required
    }
  }
  await clearSessionAndNotify();
}
