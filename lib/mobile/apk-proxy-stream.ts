import { randomUUID } from "node:crypto";

import {
  logApkProxyBytesProgress,
  logApkProxyComplete,
  logApkProxyDisconnect,
  logApkProxyResponseHeaders,
  sanitizeUserAgent,
} from "./apk-proxy-request-log";

export function createCountedResponseStream(input: {
  requestId: string;
  versionCode: number;
  userAgent: string | null;
  body: ReadableStream<Uint8Array>;
  status: number;
  contentLength: number | null;
  contentType: string;
  extraHeaders?: Record<string, string>;
}): Response {
  const started = Date.now();
  let bytesStreamed = 0;
  const ua = sanitizeUserAgent(input.userAgent);

  logApkProxyResponseHeaders({
    requestId: input.requestId,
    versionCode: input.versionCode,
    status: input.status,
    contentLength: input.contentLength,
    contentType: input.contentType,
    rangeHeader: null,
    userAgent: ua,
  });

  const reader = input.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          logApkProxyComplete({
            requestId: input.requestId,
            versionCode: input.versionCode,
            bytesStreamed,
            durationMs: Date.now() - started,
            userAgent: ua,
            status: input.status,
          });
          controller.close();
          return;
        }
        if (value) {
          bytesStreamed += value.byteLength;
          if (bytesStreamed === value.byteLength || bytesStreamed % 5_000_000 < value.byteLength) {
            logApkProxyBytesProgress({
              requestId: input.requestId,
              versionCode: input.versionCode,
              bytesStreamed,
              userAgent: ua,
            });
          }
          controller.enqueue(value);
        }
      } catch (err) {
        logApkProxyDisconnect({
          requestId: input.requestId,
          versionCode: input.versionCode,
          bytesStreamed,
          durationMs: Date.now() - started,
          userAgent: ua,
          detail: err instanceof Error ? err.message.slice(0, 120) : "stream_error",
        });
        controller.error(err);
      }
    },
    cancel(reason) {
      logApkProxyDisconnect({
        requestId: input.requestId,
        versionCode: input.versionCode,
        bytesStreamed,
        durationMs: Date.now() - started,
        userAgent: ua,
        detail: typeof reason === "string" ? reason.slice(0, 120) : "client_cancel",
      });
      void reader.cancel(reason);
    },
  });

  const headers = new Headers();
  headers.set("Content-Type", input.contentType);
  if (input.contentLength != null) headers.set("Content-Length", String(input.contentLength));
  headers.set("Cache-Control", "public, max-age=300");
  headers.set("X-Apk-Proxy-Request-Id", input.requestId);
  for (const [k, v] of Object.entries(input.extraHeaders ?? {})) headers.set(k, v);

  return new Response(stream, { status: input.status, headers });
}

export function newApkProxyRequestId(): string {
  return randomUUID().slice(0, 12);
}
