import { describe, expect, it } from "vitest";

import { isUpdateEligibleForInstall } from "../apps/mobile/src/utils/update-eligibility";
import type { MobileUpdateInfo } from "../apps/mobile/src/api/endpoints";
import { mapLotDeepLinkToHref } from "../apps/mobile/src/deep-links/native-route-map";

function update(overrides: Partial<MobileUpdateInfo>): MobileUpdateInfo {
  return {
    latestVersion: "0.1.8-beta.1",
    versionCode: 7,
    versionName: "0.1.8-beta.1",
    updateRequired: false,
    updateState: "OPTIONAL_UPDATE",
    mandatory: false,
    downloadUrl: "https://example.com/app.apk",
    sha256: null,
    releaseNotes: [],
    channel: "CLOSED_BETA",
    rollout: { percent: 100, eligible: true },
    compatibility: { compatible: true, forceUpgrade: false },
    ...overrides,
  };
}

describe("mobile interaction audit — update eligibility", () => {
  it("does not offer downgrade when latest versionCode is older", () => {
    expect(isUpdateEligibleForInstall(update({ versionCode: 5, updateState: "OPTIONAL_UPDATE" }), 7)).toBe(false);
  });

  it("does not offer update for same versionCode", () => {
    expect(isUpdateEligibleForInstall(update({ versionCode: 7, updateState: "NO_UPDATE" }), 7)).toBe(false);
  });

  it("offers newer beta when versionCode is higher", () => {
    expect(isUpdateEligibleForInstall(update({ versionCode: 8, updateState: "OPTIONAL_UPDATE" }), 7)).toBe(true);
  });
});

describe("mobile interaction audit — seller deep link", () => {
  it("maps lot://seller/{id} to native seller storefront", () => {
    expect(mapLotDeepLinkToHref("lot://seller/abc123")).toBe("/seller/abc123");
  });
});

describe("mobile interaction audit — checkout deep link", () => {
  it("maps lot://checkout and lot:///checkout to native checkout", () => {
    expect(mapLotDeepLinkToHref("lot://checkout")).toBe("/checkout");
    expect(mapLotDeepLinkToHref("lot://checkout/")).toBe("/checkout");
    expect(mapLotDeepLinkToHref("lot:///checkout")).toBe("/checkout");
    expect(mapLotDeepLinkToHref("lot:///checkout/")).toBe("/checkout");
  });

  it("maps cart/product/orders/profile deep links", () => {
    expect(mapLotDeepLinkToHref("lot://cart")).toBe("/cart");
    expect(mapLotDeepLinkToHref("lot://product/abc-123")).toBe("/product/abc-123");
    expect(mapLotDeepLinkToHref("lot://orders")).toBe("/(tabs)/orders");
    expect(mapLotDeepLinkToHref("lot://profile")).toBe("/(tabs)/profile");
  });

  it("returns null for unknown lot links (safe fallback)", () => {
    expect(mapLotDeepLinkToHref("lot://unknown-screen")).toBeNull();
  });
});
