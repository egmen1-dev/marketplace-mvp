import { describe, expect, it } from "vitest";

import { resolveUpdateState } from "@/lib/mobile-release-platform/update-service/resolve-update-state";

describe("resolveUpdateState", () => {
  it("returns NO_UPDATE when client is current", () => {
    expect(
      resolveUpdateState({
        clientVersionCode: 2,
        latestVersionCode: 2,
        hasDownloadUrl: true,
        rolloutEligible: true,
        updateRequired: false,
        mandatory: false,
        forceUpgrade: false,
        compatible: true,
      }),
    ).toBe("NO_UPDATE");
  });

  it("returns OPTIONAL_UPDATE for compatible newer release", () => {
    expect(
      resolveUpdateState({
        clientVersionCode: 1,
        latestVersionCode: 2,
        hasDownloadUrl: true,
        rolloutEligible: true,
        updateRequired: false,
        mandatory: false,
        forceUpgrade: false,
        compatible: true,
      }),
    ).toBe("OPTIONAL_UPDATE");
  });

  it("returns REQUIRED_UPDATE when mandatory", () => {
    expect(
      resolveUpdateState({
        clientVersionCode: 1,
        latestVersionCode: 2,
        hasDownloadUrl: true,
        rolloutEligible: true,
        updateRequired: true,
        mandatory: true,
        forceUpgrade: false,
        compatible: true,
      }),
    ).toBe("REQUIRED_UPDATE");
  });

  it("returns RECOMMENDED_UPDATE when incompatible but newer exists", () => {
    expect(
      resolveUpdateState({
        clientVersionCode: 1,
        latestVersionCode: 2,
        hasDownloadUrl: true,
        rolloutEligible: true,
        updateRequired: false,
        mandatory: false,
        forceUpgrade: false,
        compatible: false,
      }),
    ).toBe("RECOMMENDED_UPDATE");
  });
});
