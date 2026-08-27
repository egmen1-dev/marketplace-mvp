import { describe, expect, it } from "vitest";

import { resolveClientDownloadUrl } from "@/lib/mobile-release-platform/download-url";
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
  it("returns upstream URL when proxy disabled", () => {
    expect(resolveClientDownloadUrl(baseRelease)).toBe(baseRelease.downloadUrl);
  });
});
