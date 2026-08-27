/** Resolve client-facing APK download URL — Railway proxy for legacy Android clients. */

import type { ReleaseVersion } from "./types";

function publicAppOrigin(): string | null {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);
  if (!base) return null;
  return (base.startsWith("http") ? base : `https://${base}`).replace(/\/$/, "");
}

function shouldProxyDownloadUrl(downloadUrl: string): boolean {
  if (process.env.MOBILE_APK_PROXY_DOWNLOAD === "0") return false;
  if (process.env.MOBILE_APK_PROXY_DOWNLOAD === "1") return true;
  // RC10.5 bridge: auto-proxy GitHub raw when app has a public origin (Railway staging).
  return downloadUrl.includes("raw.githubusercontent.com") && publicAppOrigin() != null;
}

export function buildApkProxyDownloadUrl(versionCode: number, origin?: string | null): string | null {
  const base = origin ?? publicAppOrigin();
  if (!base) return null;
  return `${base}/api/mobile/releases/apk?versionCode=${versionCode}`;
}

export function resolveClientDownloadUrl(release: ReleaseVersion | null): string | null {
  if (!release?.downloadUrl) return null;
  if (!shouldProxyDownloadUrl(release.downloadUrl)) return release.downloadUrl;
  return buildApkProxyDownloadUrl(release.versionCode) ?? release.downloadUrl;
}
