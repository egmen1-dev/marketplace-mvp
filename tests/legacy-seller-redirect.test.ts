import { describe, expect, it } from "vitest";

import { resolveLegacySellerCabinetRedirect, ROUTES } from "@/lib/constants";

describe("resolveLegacySellerCabinetRedirect", () => {
  it("maps legacy cabinet paths to unified account", () => {
    expect(resolveLegacySellerCabinetRedirect("/seller/dashboard")).toBe(
      ROUTES.ACCOUNT,
    );
    expect(resolveLegacySellerCabinetRedirect("/seller/products")).toBe(
      ROUTES.ACCOUNT_PRODUCTS,
    );
    expect(resolveLegacySellerCabinetRedirect("/seller/products/new")).toBe(
      ROUTES.ACCOUNT_PRODUCTS_NEW,
    );
    expect(resolveLegacySellerCabinetRedirect("/seller/orders")).toBe(
      ROUTES.ACCOUNT_SALES,
    );
  });

  it("does not redirect public storefront slugs", () => {
    expect(resolveLegacySellerCabinetRedirect("/seller/raizz")).toBeNull();
    expect(resolveLegacySellerCabinetRedirect("/seller/cmsmzsjx")).toBeNull();
  });
});
