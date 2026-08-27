import { NextResponse } from "next/server";

import { queryApkProxyEvents } from "@/lib/mobile/apk-proxy-request-log";

/**
 * GET /api/mobile/releases/apk/request-log?versionCode=23&since=ISO8601
 * Sanitized in-memory probe log for physical RC10.5 correlation (no secrets).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const versionCodeRaw = url.searchParams.get("versionCode");
  const since = url.searchParams.get("since") ?? undefined;
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const versionCode = versionCodeRaw ? Number(versionCodeRaw) : undefined;

  if (versionCodeRaw && !Number.isFinite(versionCode)) {
    return NextResponse.json({ error: "invalid versionCode" }, { status: 400 });
  }

  const events = queryApkProxyEvents({
    versionCode: Number.isFinite(versionCode) ? versionCode : undefined,
    since,
    limit: Number.isFinite(limitRaw) ? Math.min(limitRaw, 100) : 50,
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    versionCode: versionCode ?? null,
    since: since ?? null,
    count: events.length,
    events,
    probeProcedure: {
      steps: [
        "RC10.5 remains installed",
        "Open update screen",
        "Tap Повторить",
        "Wait until RC10.7 metadata visible",
        "Record clock time to the second",
        "Tap Скачать обновление exactly once",
        "Wait 20 seconds",
        "Query this endpoint with since=tapTime-30s",
      ],
      classification: "HTTP_REQUEST_FROM_DEVICE=YES if request_started for versionCode=23 within ±30s of tap",
    },
  });
}
