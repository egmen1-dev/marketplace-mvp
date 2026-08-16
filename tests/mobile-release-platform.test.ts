import { beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateCompatibility } from "@/lib/mobile-release-platform/compatibility";
import { channelLabel } from "@/lib/mobile-release-platform/channels";
import { isDeviceEligibleForRollout } from "@/lib/mobile-release-platform/release-manager";
import { buildMobileUpdatePayload } from "@/lib/mobile-release-platform/update-service";
import type { ReleaseVersion } from "@/lib/mobile-release-platform/types";

const publishedRelease: ReleaseVersion = {
  id: "rel-1",
  versionName: "0.1.0-alpha",
  versionCode: 2,
  gitCommit: "abc1234",
  sha256: "sha256-test",
  channel: "CLOSED_ALPHA",
  releaseNotes: "Closed Alpha build\nBug fixes",
  publishedAt: "2026-08-16T00:00:00.000Z",
  minBackendVersion: "mobile-v1",
  minAppVersion: "0.1.0-alpha",
  buildNumber: "2",
  status: "PUBLISHED",
  downloadUrl: "https://example.com/lot.apk",
  artifactSizeBytes: 90000000,
  rolloutPercent: 100,
  mandatory: false,
  packageId: "ru.lot.marketplace.alpha",
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mobileReleaseVersion: {
      count: vi.fn(async () => 1),
      findFirst: vi.fn(async () => publishedRelease),
      findMany: vi.fn(async () => [publishedRelease]),
    },
  },
}));

vi.mock("@/lib/mobile-release-platform/registry", () => ({
  seedRegistryFromManifestIfEmpty: vi.fn(async () => null),
  getLatestPublishedRelease: vi.fn(async () => publishedRelease),
  listReleaseVersions: vi.fn(async () => [publishedRelease]),
}));

describe("mobile release platform wave 0", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("evaluates compatibility for older client", () => {
    const result = evaluateCompatibility(publishedRelease, { clientVersionCode: 1 });
    expect(result.compatible).toBe(false);
    expect(result.forceUpgrade).toBe(true);
    expect(result.reasons).toContain("app_version_below_minimum");
  });

  it("returns channel labels for Closed Alpha", () => {
    expect(channelLabel("CLOSED_ALPHA")).toBe("Closed Alpha");
  });

  it("uses deterministic rollout buckets", () => {
    expect(isDeviceEligibleForRollout("device-a", 100)).toBe(true);
    expect(isDeviceEligibleForRollout(undefined, 50)).toBe(false);
  });

  it("builds update payload with download URL for eligible device", async () => {
    const payload = await buildMobileUpdatePayload({
      clientVersionCode: 1,
      deviceId: "lot-android-34",
      channel: "CLOSED_ALPHA",
    });

    expect(payload.latestVersion).toBe("0.1.0-alpha");
    expect(payload.downloadUrl).toBe("https://example.com/lot.apk");
    expect(payload.sha256).toBe("sha256-test");
    expect(payload.releaseNotes).toEqual(["Closed Alpha build", "Bug fixes"]);
    expect(payload.compatibility.compatible).toBe(false);
    expect(payload.rollout.percent).toBe(100);
  });

  it("documents unified update route", async () => {
    const route = await import("@/app/api/mobile/update/route");
    expect(typeof route.GET).toBe("function");
  });

  it("documents manifest route", async () => {
    const route = await import("@/app/api/mobile/releases/manifest/route");
    expect(typeof route.GET).toBe("function");
  });
});
