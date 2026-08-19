import { loadAppConfig } from "../config/env";
import { ApiClientError, DEFAULT_FETCH_TIMEOUT_MS } from "../api/client";
import type { MobileErrorPayload } from "../types/api";
import {
  logStartupRequestFail,
  logStartupRequestOk,
  logStartupRequestStart,
  type StartupStage,
} from "./startup-diagnostics";

function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal =
    init.signal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;
  return fetch(url, { ...init, signal });
}

async function httpErrorFromResponse(res: Response, bodyText: string): Promise<ApiClientError> {
  try {
    const body = JSON.parse(bodyText) as MobileErrorPayload & { message?: string; error?: string };
    const nested = body.error;
    if (nested?.code) {
      return new ApiClientError(nested.code, nested.message, Boolean(nested.retryable), res.status);
    }
    return new ApiClientError(
      "HTTP_ERROR",
      body.message ?? (typeof body.error === "string" ? body.error : res.statusText),
      res.status >= 500,
      res.status,
    );
  } catch {
    return new ApiClientError(
      "HTTP_ERROR",
      bodyText.slice(0, 200) || res.statusText,
      res.status >= 500,
      res.status,
    );
  }
}

export async function bootApiGet<T>(
  stage: StartupStage,
  path: string,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<T> {
  const config = loadAppConfig();
  const url = `${config.apiBaseUrl}${path}`;
  logStartupRequestStart(stage, url, "GET");
  const started = Date.now();
  let bodyText = "";

  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
      timeoutMs,
    );

    bodyText = await res.text();
    const durationMs = Date.now() - started;

    if (!res.ok) {
      throw await httpErrorFromResponse(res, bodyText);
    }

    logStartupRequestOk(stage, url, res.status, durationMs);
    return JSON.parse(bodyText) as T;
  } catch (err) {
    logStartupRequestFail(stage, url, err, Date.now() - started, bodyText.slice(0, 500));
    throw err;
  }
}
