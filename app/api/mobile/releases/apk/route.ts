import { NextResponse } from "next/server";

import {
  logApkProxyError,
  logApkProxyRequestStarted,
  sanitizeUserAgent,
} from "@/lib/mobile/apk-proxy-request-log";
import { createCountedResponseStream, newApkProxyRequestId } from "@/lib/mobile/apk-proxy-stream";
import { getReleaseByVersionCode } from "@/lib/mobile-release-platform/registry";

/**
 * GET /api/mobile/releases/apk?versionCode=23
 * Streams published APK bytes through Railway with sanitized request probe logging.
 */
export async function GET(request: Request) {
  const requestId = newApkProxyRequestId();
  const url = new URL(request.url);
  const versionCode = Number(url.searchParams.get("versionCode"));
  const userAgent = sanitizeUserAgent(request.headers.get("user-agent"));
  const rangeHeader = request.headers.get("range");

  if (!Number.isFinite(versionCode) || versionCode < 1) {
    return NextResponse.json({ error: "versionCode required" }, { status: 400 });
  }

  logApkProxyRequestStarted({
    requestId,
    versionCode,
    method: request.method,
    userAgent,
    rangeHeader,
  });

  const release = await getReleaseByVersionCode(versionCode);
  if (!release || release.status !== "PUBLISHED" || !release.downloadUrl) {
    logApkProxyError({
      requestId,
      versionCode,
      kind: "handler_error",
      userAgent,
      detail: "release_not_found",
    });
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  const upstream = release.downloadUrl;
  if (upstream.includes("/api/mobile/releases/apk")) {
    logApkProxyError({
      requestId,
      versionCode,
      kind: "handler_error",
      userAgent,
      detail: "proxy_loop",
    });
    return NextResponse.json({ error: "Proxy loop detected" }, { status: 500 });
  }

  try {
    const upstreamHeaders: HeadersInit = {};
    if (rangeHeader) upstreamHeaders.Range = rangeHeader;

    const upstreamRes = await fetch(upstream, {
      redirect: "follow",
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(600_000),
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      logApkProxyError({
        requestId,
        versionCode,
        kind: "upstream_error",
        userAgent,
        detail: `upstream_status_${upstreamRes.status}`,
      });
      return NextResponse.json(
        { error: "Upstream artifact unavailable", upstreamStatus: upstreamRes.status, requestId },
        { status: 502 },
      );
    }

    const contentLengthHeader = upstreamRes.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;

    return createCountedResponseStream({
      requestId,
      versionCode,
      userAgent,
      body: upstreamRes.body,
      status: upstreamRes.status,
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
      contentType: "application/vnd.android.package-archive",
      extraHeaders: {
        "X-Release-SHA256": release.sha256,
        "X-Release-Version-Code": String(release.versionCode),
        "X-Release-Version-Name": release.versionName,
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err) {
    logApkProxyError({
      requestId,
      versionCode,
      kind: "handler_error",
      userAgent,
      detail: err instanceof Error ? err.message : "proxy_fetch_failed",
    });
    return NextResponse.json({ error: "Proxy handler failed", requestId }, { status: 500 });
  }
}
