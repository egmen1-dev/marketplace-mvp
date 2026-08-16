import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildAndroidUpdatePayload } from "@/lib/mobile/android-update";
import { MOBILE_API_VERSION } from "@/lib/mobile/api-contract";

const emptyRelease = null;

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mobileReleaseVersion: {
      count: vi.fn(async () => 0),
      findFirst: vi.fn(async () => emptyRelease),
    },
  },
}));

vi.mock("@/lib/mobile-release-platform/registry", () => ({
  seedRegistryFromManifestIfEmpty: vi.fn(async () => null),
  getLatestPublishedRelease: vi.fn(async () => emptyRelease),
}));

describe("mobile android update contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns foundation payload without download URL when registry is empty", async () => {
    const payload = await buildAndroidUpdatePayload();
    expect(payload.versionCode).toBe(1);
    expect(payload.versionName).toBe("0.0.0-dev");
    expect(payload.minimumSupportedVersionCode).toBe(1);
    expect(payload.latestVersion).toBe("0.0.0-dev");
    expect(payload.updateRequired).toBe(false);
    expect(payload.downloadUrl).toBeNull();
    expect(payload.sha256).toBeNull();
    expect(payload.publishedAt).toBeNull();
    expect(payload.advisoryOnly).toBe(true);
  });

  it("documents APK update endpoint route", async () => {
    const route = await import("@/app/api/mobile/android/update/route");
    expect(typeof route.GET).toBe("function");
  });

  it("keeps API contract version aligned with mobile envelope", () => {
    expect(MOBILE_API_VERSION).toBe("mobile-api-v1");
  });
});
