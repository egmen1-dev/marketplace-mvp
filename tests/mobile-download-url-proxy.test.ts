import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApkProxyDownloadUrl, resolveClientDownloadUrl } from "@/lib/mobile-release-platform/download-url";
import type { ReleaseVersion } from "@/lib/mobile-release-platform/types";

const baseRelease: ReleaseVersion = {
  id: "r1",
  versionName: "0.1.15-beta.8",
  versionCode: 23,
  gitCommit: "abc",
  sha256: "4b4f88df493eee141019d27e88da37840186e21dbcd45429364e031aa5d9a043",
  channel: "BETA",
  releaseNotes: "",
  publishedAt: null,
  minBackendVersion: "mobile-v1",
  minAppVersion: "0.1.15-beta.8",
  buildNumber: "23",
  status: "PUBLISHED",
  downloadUrl:
    "https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc10.7/lot_android_closed_beta_0.1.15_beta.8.apk",
  artifactSizeBytes: 44411738,
  rolloutPercent: 100,
  mandatory: false,
  packageId: "ru.lot.marketplace.alpha",
};

describe("resolveClientDownloadUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns upstream URL when no public origin (local dev)", () => {
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(resolveClientDownloadUrl(baseRelease)).toBe(baseRelease.downloadUrl);
  });

  it("auto-proxies GitHub raw when Railway public domain is set", () => {
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "web-production-e56fb.up.railway.app");
    expect(resolveClientDownloadUrl(baseRelease)).toBe(
      "https://web-production-e56fb.up.railway.app/api/mobile/releases/apk?versionCode=23",
    );
  });

  it("honours explicit MOBILE_APK_PROXY_DOWNLOAD=1", () => {
    vi.stubEnv("MOBILE_APK_PROXY_DOWNLOAD", "1");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    expect(resolveClientDownloadUrl({ ...baseRelease, downloadUrl: "https://cdn.example/apk.apk" })).toBe(
      "https://example.test/api/mobile/releases/apk?versionCode=23",
    );
  });

  it("buildApkProxyDownloadUrl uses explicit origin", () => {
    expect(buildApkProxyDownloadUrl(23, "https://staging.test")).toBe(
      "https://staging.test/api/mobile/releases/apk?versionCode=23",
    );
  });
});
