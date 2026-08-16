import { loadAppConfig } from "../config/env";
import type { MobileErrorPayload, MobileEnvelope } from "../types/api";
import { clearSession, getAccessToken, getDeviceId, getRefreshToken, saveTokens } from "../storage/secure-session";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = false,
    public status = 400,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

let memoryAccessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setMemoryAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

async function parseError(res: Response): Promise<ApiClientError> {
  const body = (await res.json().catch(() => ({}))) as MobileErrorPayload & { message?: string; error?: string };
  const nested = body.error;
  if (nested?.code) {
    return new ApiClientError(nested.code, nested.message, Boolean(nested.retryable), res.status);
  }
  return new ApiClientError("HTTP_ERROR", body.message ?? body.error ?? res.statusText, res.status >= 500, res.status);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const config = loadAppConfig();
    const res = await fetch(`${config.apiBaseUrl}/api/mobile/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      const err = await parseError(res);
      if (err.code === "REFRESH_REVOKED" || err.code === "REFRESH_INVALID" || err.code === "REFRESH_REPLAY") {
        await clearSession();
        memoryAccessToken = null;
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

    await saveTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      meta: {
        sessionId: data.sessionId,
        userId: data.userId ?? "",
        role: data.role ?? "BUYER",
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

  const res = await fetch(`${config.apiBaseUrl}${path}`, { ...init, headers });

  if (res.status === 401 && retry) {
    const err = await parseError(res);
    if (err.code === "TOKEN_EXPIRED" || err.code === "UNAUTHORIZED" || err.message.toLowerCase().includes("token")) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return apiRequest<T>(path, init, false);
    }
    throw err;
  }

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export async function login(input: { email: string; password: string; pendingDeepLink?: string }) {
  const config = loadAppConfig();
  const res = await fetch(`${config.apiBaseUrl}/api/mobile/auth/session`, {
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
  await clearSession();
  memoryAccessToken = null;
}
