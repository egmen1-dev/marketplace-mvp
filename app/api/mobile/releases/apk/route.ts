import { NextResponse } from "next/server";

import { getReleaseByVersionCode } from "@/lib/mobile-release-platform/registry";

/**
 * GET /api/mobile/releases/apk?versionCode=23
 * Streams published APK bytes through Railway so legacy RC10.5 clients can download
 * without reaching raw.githubusercontent.com directly (device network compatibility).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const versionCode = Number(url.searchParams.get("versionCode"));
  if (!Number.isFinite(versionCode) || versionCode < 1) {
    return NextResponse.json({ error: "versionCode required" }, { status: 400 });
  }

  const release = await getReleaseByVersionCode(versionCode);
  if (!release || release.status !== "PUBLISHED" || !release.downloadUrl) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  const upstream = release.downloadUrl;
  if (upstream.includes("/api/mobile/releases/apk")) {
    return NextResponse.json({ error: "Proxy loop detected" }, { status: 500 });
  }

  const upstreamRes = await fetch(upstream, {
    redirect: "follow",
    signal: AbortSignal.timeout(300_000),
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    return NextResponse.json(
      { error: "Upstream artifact unavailable", upstreamStatus: upstreamRes.status },
      { status: 502 },
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/vnd.android.package-archive");
  const contentLength = upstreamRes.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("X-Release-SHA256", release.sha256);
  headers.set("X-Release-Version-Code", String(release.versionCode));
  headers.set("X-Release-Version-Name", release.versionName);
  headers.set("Cache-Control", "public, max-age=300");

  return new NextResponse(upstreamRes.body, { status: 200, headers });
}
