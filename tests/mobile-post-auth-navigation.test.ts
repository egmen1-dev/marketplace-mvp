import { describe, expect, it } from "vitest";

import { shouldCaptureAsPendingDeepLink, isExternalWebUrl, isLotDeepLink } from "@/apps/mobile/src/deep-links/is-app-deep-link";
import { mapWebPathToNativeHref } from "@/apps/mobile/src/deep-links/native-route-map";
import { resolvePostAuthHref } from "@/apps/mobile/src/deep-links/resolve-post-auth-href";

const STAGING_ROOT = "https://web-production-e56fb.up.railway.app";

describe("mobile post-auth native navigation guard", () => {
  it("does not treat staging https root as a capturable deep link", () => {
    expect(isExternalWebUrl(STAGING_ROOT)).toBe(true);
    expect(isLotDeepLink(STAGING_ROOT)).toBe(false);
    expect(shouldCaptureAsPendingDeepLink(STAGING_ROOT)).toBe(false);
    expect(shouldCaptureAsPendingDeepLink("lot://product/abc")).toBe(true);
  });

  it("maps staging web paths to native routes instead of external URLs", () => {
    expect(mapWebPathToNativeHref(STAGING_ROOT)).toBe("/(tabs)");
    expect(mapWebPathToNativeHref(`${STAGING_ROOT}/products/sku-1`)).toBe("/product/sku-1");
    expect(mapWebPathToNativeHref("/account/wallet")).toBe("/(tabs)/wallet");
  });

  it("resolvePostAuthHref stays native for buyer login", () => {
    expect(
      resolvePostAuthHref({
        role: "BUYER",
        pendingDeepLink: STAGING_ROOT,
        destination: null,
      }),
    ).toBe("/(tabs)");
  });

  it("resolvePostAuthHref routes sellers to seller home", () => {
    expect(resolvePostAuthHref({ role: "SELLER" })).toBe("/(tabs)/seller-home");
  });

  it("resolvePostAuthHref honors lot:// pending deep links", () => {
    expect(
      resolvePostAuthHref({
        role: "BUYER",
        pendingDeepLink: "lot://product/p-42",
      }),
    ).toBe("/product/p-42");
  });

  it("resolvePostAuthHref never returns an external https href", () => {
    const href = resolvePostAuthHref({
      role: "BUYER",
      pendingDeepLink: STAGING_ROOT,
      destination: { webPath: "/" },
    });
    expect(href.startsWith("http")).toBe(false);
    expect(href).toBe("/(tabs)");
  });
});
