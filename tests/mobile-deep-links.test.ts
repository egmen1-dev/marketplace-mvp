import { describe, expect, it } from "vitest";

import { MOBILE_DEEP_LINK_PATTERNS, resolveMobileDeepLink } from "@/lib/mobile/deep-links";

describe("mobile deep links", () => {
  it("defines stable lot:// patterns", () => {
    expect(MOBILE_DEEP_LINK_PATTERNS.product).toBe("lot://product/{id}");
    expect(MOBILE_DEEP_LINK_PATTERNS.wallet).toBe("lot://wallet");
    expect(MOBILE_DEEP_LINK_PATTERNS.brainProduct).toBe("lot://brain/product/{id}");
  });

  it("resolves product deep link to web path", () => {
    const dest = resolveMobileDeepLink("lot://product/abc-123");
    expect(dest?.type).toBe("product");
    expect(dest && "productId" in dest && dest.productId).toBe("abc-123");
    expect(dest?.webPath).toBe("/products/abc-123");
  });

  it("resolves wallet and brain product links", () => {
    expect(resolveMobileDeepLink("lot://wallet")?.webPath).toBe("/account/wallet");
    const brain = resolveMobileDeepLink("lot://brain/product/p-99");
    expect(brain?.type).toBe("brain_product");
    expect(brain && "productId" in brain && brain.productId).toBe("p-99");
  });

  it("resolves https product URLs", () => {
    const dest = resolveMobileDeepLink("https://example.com/products/sku-1");
    expect(dest?.webPath).toBe("/products/sku-1");
  });
});
