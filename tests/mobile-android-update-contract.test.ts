import { describe, expect, it } from "vitest";

import { buildAndroidUpdatePayload } from "@/lib/mobile/android-update";
import { MOBILE_API_VERSION } from "@/lib/mobile/api-contract";

describe("mobile android update contract", () => {
  it("returns foundation payload without download URL", () => {
    const payload = buildAndroidUpdatePayload();
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
