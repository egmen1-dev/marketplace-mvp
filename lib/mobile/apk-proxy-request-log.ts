/**
 * In-memory ring buffer for APK proxy request observation (RC10.5 device bridge probe).
 * No secrets, no persistent IP storage — sanitized for staging forensics only.
 */

import { createHash, randomUUID } from "node:crypto";

const MAX_EVENTS = 200;

export type ApkProxyRequestEventKind =
  | "request_started"
  | "response_headers"
  | "bytes_progress"
  | "response_complete"
  | "client_disconnect"
  | "upstream_error"
  | "handler_error";

export type ApkProxyRequestEvent = {
  id: string;
  requestId: string;
  at: string;
  versionCode: number;
  kind: ApkProxyRequestEventKind;
  method: string;
  userAgent: string | null;
  rangeHeader: string | null;
  status?: number;
  contentLength?: number | null;
  contentType?: string | null;
  bytesStreamed?: number;
  durationMs?: number;
  detail?: string;
};

const events: ApkProxyRequestEvent[] = [];

function push(event: Omit<ApkProxyRequestEvent, "id" | "at"> & { at?: string }): ApkProxyRequestEvent {
  const row: ApkProxyRequestEvent = {
    id: randomUUID().slice(0, 8),
    at: event.at ?? new Date().toISOString(),
    ...event,
  };
  events.push(row);
  while (events.length > MAX_EVENTS) events.shift();
  console.info(
    `[apk-proxy-probe] ${row.at} requestId=${row.requestId} vc=${row.versionCode} ${row.kind} ua=${row.userAgent?.slice(0, 40) ?? "-"} range=${row.rangeHeader ?? "-"} bytes=${row.bytesStreamed ?? "-"} status=${row.status ?? "-"} ${row.detail ?? ""}`,
  );
  return row;
}

export function sanitizeUserAgent(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 160).replace(/[^\x20-\x7E]/g, "");
}

export function hashClientHint(value: string | null): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function logApkProxyRequestStarted(input: {
  requestId: string;
  versionCode: number;
  method: string;
  userAgent: string | null;
  rangeHeader: string | null;
}): void {
  push({
    requestId: input.requestId,
    versionCode: input.versionCode,
    kind: "request_started",
    method: input.method,
    userAgent: sanitizeUserAgent(input.userAgent),
    rangeHeader: input.rangeHeader,
  });
}

export function logApkProxyResponseHeaders(input: {
  requestId: string;
  versionCode: number;
  status: number;
  contentLength: number | null;
  contentType: string | null;
  rangeHeader: string | null;
  userAgent: string | null;
}): void {
  push({
    requestId: input.requestId,
    versionCode: input.versionCode,
    kind: "response_headers",
    method: "GET",
    userAgent: sanitizeUserAgent(input.userAgent),
    rangeHeader: input.rangeHeader,
    status: input.status,
    contentLength: input.contentLength,
    contentType: input.contentType,
  });
}

export function logApkProxyBytesProgress(input: {
  requestId: string;
  versionCode: number;
  bytesStreamed: number;
  userAgent: string | null;
}): void {
  const last = events[events.length - 1];
  if (
    last?.requestId === input.requestId &&
    last.kind === "bytes_progress" &&
    input.bytesStreamed - (last.bytesStreamed ?? 0) < 5_000_000
  ) {
    return;
  }
  push({
    requestId: input.requestId,
    versionCode: input.versionCode,
    kind: "bytes_progress",
    method: "GET",
    userAgent: sanitizeUserAgent(input.userAgent),
    rangeHeader: null,
    bytesStreamed: input.bytesStreamed,
  });
}

export function logApkProxyComplete(input: {
  requestId: string;
  versionCode: number;
  bytesStreamed: number;
  durationMs: number;
  userAgent: string | null;
  status: number;
}): void {
  push({
    requestId: input.requestId,
    versionCode: input.versionCode,
    kind: "response_complete",
    method: "GET",
    userAgent: sanitizeUserAgent(input.userAgent),
    rangeHeader: null,
    bytesStreamed: input.bytesStreamed,
    durationMs: input.durationMs,
    status: input.status,
  });
}

export function logApkProxyDisconnect(input: {
  requestId: string;
  versionCode: number;
  bytesStreamed: number;
  durationMs: number;
  userAgent: string | null;
  detail?: string;
}): void {
  push({
    requestId: input.requestId,
    versionCode: input.versionCode,
    kind: "client_disconnect",
    method: "GET",
    userAgent: sanitizeUserAgent(input.userAgent),
    rangeHeader: null,
    bytesStreamed: input.bytesStreamed,
    durationMs: input.durationMs,
    detail: input.detail,
  });
}

export function logApkProxyError(input: {
  requestId: string;
  versionCode: number;
  kind: "upstream_error" | "handler_error";
  userAgent: string | null;
  detail: string;
}): void {
  push({
    requestId: input.requestId,
    versionCode: input.versionCode,
    kind: input.kind,
    method: "GET",
    userAgent: sanitizeUserAgent(input.userAgent),
    rangeHeader: null,
    detail: input.detail.slice(0, 200),
  });
}

export function queryApkProxyEvents(input: {
  versionCode?: number;
  since?: string;
  limit?: number;
}): ApkProxyRequestEvent[] {
  const sinceMs = input.since ? Date.parse(input.since) : 0;
  return events
    .filter((e) => (input.versionCode == null || e.versionCode === input.versionCode))
    .filter((e) => !sinceMs || Date.parse(e.at) >= sinceMs)
    .slice(-(input.limit ?? 50));
}

export function resetApkProxyEventsForTests(): void {
  events.length = 0;
}
