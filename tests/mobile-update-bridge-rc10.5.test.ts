import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  rc105BeginCheck,
  rc105CompleteCheck,
  rc105DownloadHandlerReachable,
} from "@/lib/mobile/update-bridge-rc10.5/rc10.5-check-flow";
import {
  RC105_UPDATE_ERROR_MESSAGES,
  RC105_UI_LABELS,
  getRc105UpdateErrorMessage,
  mapRc105UpdateError,
  rc105WouldShowAvailableHint,
} from "@/lib/mobile/update-bridge-rc10.5/types";
import { resolveClientDownloadUrl } from "@/lib/mobile-release-platform/download-url";
import type { ReleaseVersion } from "@/lib/mobile-release-platform/types";

const RC107_INFO = {
  versionName: "0.1.15-beta.8",
  versionCode: 23,
  downloadUrl: "https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc10.7/lot_android_closed_beta_0.1.15_beta.8.apk",
  sha256: "4b4f88df493eee141019d27e88da37840186e21dbcd45429364e031aa5d9a043",
  updateState: "OPTIONAL_UPDATE",
  rollout: { eligible: true },
};

describe("RC10.5 update bridge — client forensics", () => {
  it("maps timeout/network fetch failures to misleading internet copy", () => {
    expect(mapRc105UpdateError(new Error("SocketTimeoutException: timeout"))).toBe("network_error");
    expect(mapRc105UpdateError(new Error("Network request failed"))).toBe("network_error");
    expect(mapRc105UpdateError(new Error("Unable to resolve host raw.githubusercontent.com"))).toBe(
      "download_failed",
    );
    expect(getRc105UpdateErrorMessage("network_error")).toBe(
      "Не удалось проверить обновление. Проверьте интернет и попробуйте позже.",
    );
  });

  it("check catch uses installFailed without internet suffix", () => {
    expect(RC105_UI_LABELS.installFailed).toBe("Не удалось проверить обновление");
    expect(RC105_UI_LABELS.installFailed).not.toContain("Проверьте интернет");
  });

  it("stores updateInfo before cache lookup and survives check throw", () => {
    const snap = rc105CompleteCheck({
      snapshot: rc105BeginCheck(),
      info: RC107_INFO,
      installedCode: 21,
      cache: { kind: "throw" },
    });
    expect(snap.updateInfo?.versionName).toBe("0.1.15-beta.8");
    expect(snap.phase).toBe("failed");
    expect(snap.errorMessage).toBe(RC105_UI_LABELS.installFailed);
    expect(rc105WouldShowAvailableHint(snap, 21)).toBe(true);
  });

  it("download handler reachable when phase=failed and updateInfo present", () => {
    const snap = rc105CompleteCheck({
      snapshot: rc105BeginCheck(),
      info: RC107_INFO,
      installedCode: 21,
      cache: { kind: "miss" },
    });
    const failed = {
      ...snap,
      phase: "failed" as const,
      errorMessage: getRc105UpdateErrorMessage("network_error"),
    };
    const reach = rc105DownloadHandlerReachable(failed);
    expect(reach.reachable).toBe(true);
    expect(reach.downloadStateValid).toBe(true);
    expect(rc105WouldShowAvailableHint(failed, 21)).toBe(true);
  });

  it("successful check path is available without contradiction", () => {
    const snap = rc105CompleteCheck({
      snapshot: rc105BeginCheck(),
      info: RC107_INFO,
      installedCode: 21,
      cache: { kind: "miss" },
    });
    expect(snap.phase).toBe("available");
    expect(rc105WouldShowAvailableHint(snap, 21)).toBe(false);
  });
});

describe("RC10.5 update bridge — proxy download URL", () => {
  const release: ReleaseVersion = {
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

  beforeEach(() => {
    vi.stubEnv("MOBILE_APK_PROXY_DOWNLOAD", "1");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://web-production-e56fb.up.railway.app");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rewrites downloadUrl to same-origin APK proxy when enabled", () => {
    expect(resolveClientDownloadUrl(release)).toBe(
      "https://web-production-e56fb.up.railway.app/api/mobile/releases/apk?versionCode=23",
    );
  });
});
