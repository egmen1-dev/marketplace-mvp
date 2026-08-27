/** Resolve client-facing APK download URL — optional Railway proxy for legacy Android clients. */

import type { ReleaseVersion } from "./types";

export function resolveClientDownloadUrl(release: ReleaseVersion | null): string | null {
  if (!release?.downloadUrl) return null;

  if (process.env.MOBILE_APK_PROXY_DOWNLOAD !== "1") {
    return release.downloadUrl;
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);

  if (!base) return release.downloadUrl;

  const origin = base.startsWith("http") ? base : `https://${base}`;
  return `${origin.replace(/\/$/, "")}/api/mobile/releases/apk?versionCode=${release.versionCode}`;
}
