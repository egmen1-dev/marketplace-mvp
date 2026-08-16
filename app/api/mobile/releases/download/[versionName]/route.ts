import { NextResponse } from "next/server";

import {
  CLOSED_ALPHA_APK,
  CLOSED_ALPHA_APK_DOWNLOAD_URL,
  CLOSED_ALPHA_GITHUB_RELEASE_URL,
} from "@/lib/mobile-release-platform/constants";

/** Immutable APK metadata + HTTPS redirect — EPIC 80 distribution */
export async function GET(
  _request: Request,
  context: { params: Promise<{ versionName: string }> },
) {
  const { versionName } = await context.params;
  const normalized = decodeURIComponent(versionName);

  if (normalized !== CLOSED_ALPHA_APK.versionName && normalized !== "latest") {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  return NextResponse.redirect(CLOSED_ALPHA_APK_DOWNLOAD_URL, {
    status: 302,
    headers: {
      "X-Release-SHA256": CLOSED_ALPHA_APK.sha256,
      "X-Release-Version-Code": String(CLOSED_ALPHA_APK.versionCode),
      "X-Release-Version-Name": CLOSED_ALPHA_APK.versionName,
      "X-Release-Notes-Url": CLOSED_ALPHA_GITHUB_RELEASE_URL,
    },
  });
}
