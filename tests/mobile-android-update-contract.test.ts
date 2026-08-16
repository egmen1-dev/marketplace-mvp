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
  listReleaseVersions: vi.fn(async () => []),
}));

describe("mobile android update contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unsupported payload when registry is empty and client is below minimum", async () => {
    const payload = await buildAndroidUpdatePayload();
    expect(payload.updateState).toBe("UNSUPPORTED_CLIENT");
    expect(payload.reason).toBe("CLIENT_TOO_OLD");
    expect(payload.versionCode).toBe(3);
    expect(payload.versionName).toBe("0.1.2-alpha");
    expect(payload.minimumSupportedVersionCode).toBe(3);
    expect(payload.updateRequired).toBe(true);
    expect(payload.downloadUrl).toBeNull();
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
