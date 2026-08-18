import { describe, expect, it, vi } from "vitest";

import { CLOSED_ALPHA_APK, CLOSED_ALPHA_RELEASE_012 } from "@/lib/mobile-release-platform/constants";
import { buildMobileUpdatePayload } from "@/lib/mobile-release-platform/update-service";
import type { ReleaseVersion } from "@/lib/mobile-release-platform/types";

const release013: ReleaseVersion = {
  id: "rel-013",
  versionName: "0.1.3-alpha",
  versionCode: 4,
  gitCommit: "abc0130",
  sha256: "sha256-013",
  channel: "CLOSED_ALPHA",
  releaseNotes: "EPIC-84 diagnostics",
  publishedAt: "2026-08-16T20:00:00.000Z",
  minBackendVersion: "mobile-v1",
  minAppVersion: "0.1.2-alpha",
  buildNumber: "4",
  status: "PUBLISHED",
  downloadUrl: "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.3/lot-android-alpha-0.1.3.apk",
  artifactSizeBytes: 94000000,
  rolloutPercent: 100,
  mandatory: false,
  packageId: "ru.lot.marketplace.alpha",
};

const release012: ReleaseVersion = {
  ...release013,
  id: "rel-012",
  versionName: "0.1.2-alpha",
  versionCode: 3,
  gitCommit: "feb4b8d",
  downloadUrl: "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.2/lot-android-alpha-0.1.2.apk",
  buildNumber: "3",
};

vi.mock("@/lib/mobile-release-platform/registry", () => ({
  seedRegistryFromManifestIfEmpty: vi.fn(async () => null),
  getLatestPublishedRelease: vi.fn(async () => release013),
  listReleaseVersions: vi.fn(async () => [release013, release012]),
}));

describe("RELEASE 0.1.3-alpha update API", () => {
  it("defines 0.1.3-alpha as active CLOSED_ALPHA_APK", () => {
    expect(CLOSED_ALPHA_APK.versionName).toBe("0.1.3-alpha");
    expect(CLOSED_ALPHA_APK.versionCode).toBe(4);
  });

  it("returns OPTIONAL_UPDATE for versionCode 3 → 0.1.3-alpha", async () => {
    const payload = await buildMobileUpdatePayload({
      clientVersionCode: 3,
      deviceId: "release-013-test",
      channel: "CLOSED_ALPHA",
    });

    expect(payload.versionName).toBe("0.1.3-alpha");
    expect(payload.versionCode).toBe(4);
    expect(payload.updateState).toBe("OPTIONAL_UPDATE");
    expect(payload.downloadUrl).toContain("0.1.3");
  });

  it("returns NO_UPDATE for versionCode 4 on latest build", async () => {
    const payload = await buildMobileUpdatePayload({
      clientVersionCode: 4,
      deviceId: "release-013-test",
      channel: "CLOSED_ALPHA",
    });

    expect(payload.updateState).toBe("NO_UPDATE");
    expect(payload.downloadUrl).toBeNull();
  });

  it("keeps minimum supported at 0.1.2-alpha (code 3)", () => {
    expect(CLOSED_ALPHA_RELEASE_012.versionCode).toBe(3);
  });
});
