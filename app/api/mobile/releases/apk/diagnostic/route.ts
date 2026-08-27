import { NextResponse } from "next/server";

import { createCountedResponseStream, newApkProxyRequestId } from "@/lib/mobile/apk-proxy-stream";
import { logApkProxyRequestStarted, sanitizeUserAgent } from "@/lib/mobile/apk-proxy-request-log";

const ALLOWED_SIZES = new Set([10_240, 1_048_576, 10_485_760]);

/**
 * GET /api/mobile/releases/apk/diagnostic?bytes=1048576
 * Synthetic streaming payload through same proxy stack — NOT wired to MRP.
 * For throughput/timeout experiments only.
 */
export async function GET(request: Request) {
  const requestId = newApkProxyRequestId();
  const url = new URL(request.url);
  const bytes = Number(url.searchParams.get("bytes") ?? "10240");
  const userAgent = sanitizeUserAgent(request.headers.get("user-agent"));

  if (!ALLOWED_SIZES.has(bytes)) {
    return NextResponse.json(
      { error: "bytes must be one of 10240, 1048576, 10485760", allowed: [...ALLOWED_SIZES] },
      { status: 400 },
    );
  }

  logApkProxyRequestStarted({
    requestId,
    versionCode: 0,
    method: request.method,
    userAgent,
    rangeHeader: request.headers.get("range"),
  });

  const chunkSize = 64 * 1024;
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= bytes) {
        controller.close();
        return;
      }
      const remaining = bytes - sent;
      const size = Math.min(chunkSize, remaining);
      const buf = new Uint8Array(size);
      buf.fill(sent % 255);
      sent += size;
      controller.enqueue(buf);
    },
  });

  return createCountedResponseStream({
    requestId,
    versionCode: 0,
    userAgent,
    body: stream,
    status: 200,
    contentLength: bytes,
    contentType: "application/octet-stream",
    extraHeaders: {
      "X-Diagnostic-Bytes": String(bytes),
      "X-Diagnostic-Mode": "synthetic",
    },
  });
}
