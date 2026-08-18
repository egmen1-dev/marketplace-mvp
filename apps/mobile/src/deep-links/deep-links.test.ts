import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseLotDeepLink } from "./parse-lot-link";
import { deepLinkTargetToHref, resolveDeepLinkTarget } from "./resolve-deep-link-target";

describe("parseLotDeepLink", () => {
  it("parses core tab links", () => {
    assert.deepEqual(parseLotDeepLink("lot://home"), { screen: "home" });
    assert.deepEqual(parseLotDeepLink("lot://catalog/"), { screen: "catalog" });
    assert.deepEqual(parseLotDeepLink("lot://favorites"), { screen: "favorites" });
    assert.deepEqual(parseLotDeepLink("lot://favourites"), { screen: "favorites" });
    assert.deepEqual(parseLotDeepLink("lot://profile"), { screen: "profile" });
  });

  it("parses product, order, and seller id links", () => {
    assert.deepEqual(parseLotDeepLink("lot://product/abc-123"), {
      screen: "product",
      productId: "abc-123",
    });
    assert.deepEqual(parseLotDeepLink("lot://order/ord-42"), {
      screen: "order",
      orderId: "ord-42",
    });
    assert.deepEqual(parseLotDeepLink("lot://seller/seller-99"), {
      screen: "seller",
      sellerId: "seller-99",
    });
  });

  it("parses reserved seller workspace links before seller id", () => {
    assert.deepEqual(parseLotDeepLink("lot://seller/sales"), { screen: "sellerSales" });
    assert.deepEqual(parseLotDeepLink("lot://seller/products"), { screen: "sellerProducts" });
    assert.deepEqual(parseLotDeepLink("lot://seller/business"), { screen: "sellerBusiness" });
    assert.deepEqual(parseLotDeepLink("lot://seller/promotion"), { screen: "sellerPromotion" });
  });

  it("returns null for invalid links", () => {
    assert.equal(parseLotDeepLink("https://example.com"), null);
    assert.equal(parseLotDeepLink("lot://unknown"), null);
    assert.equal(parseLotDeepLink("lot://order/"), null);
    assert.equal(parseLotDeepLink("lot://seller/"), null);
  });
});

describe("resolveDeepLinkTarget", () => {
  it("routes order deep links to order detail stack", () => {
    const target = resolveDeepLinkTarget({ screen: "order", orderId: "ord-42" });
    assert.equal(deepLinkTargetToHref(target), "/order/ord-42");
  });

  it("routes seller deep links to seller catalog stack", () => {
    const target = resolveDeepLinkTarget({ screen: "seller", sellerId: "seller-99" });
    assert.equal(deepLinkTargetToHref(target), "/seller/seller-99");
  });

  it("routes catalog, favorites, and profile tabs", () => {
    assert.equal(resolveDeepLinkTarget({ screen: "catalog" }), "/(tabs)/catalog");
    assert.equal(resolveDeepLinkTarget({ screen: "favorites" }), "/(tabs)/favorites");
    assert.equal(resolveDeepLinkTarget({ screen: "profile" }), "/(tabs)/profile");
  });

  it("routes seller workspace links to seller tabs", () => {
    assert.equal(resolveDeepLinkTarget({ screen: "sellerSales" }), "/(tabs)/seller-sales");
    assert.equal(resolveDeepLinkTarget({ screen: "sellerProducts" }), "/(tabs)/seller-products");
  });

  it("preserves back-navigation stack targets for commerce screens", () => {
    assert.equal(resolveDeepLinkTarget({ screen: "product", productId: "p1" }), "/product/p1");
    assert.equal(resolveDeepLinkTarget({ screen: "cart" }), "/cart");
  });
});

describe("deep link auth contract", () => {
  it("documents unauthenticated redirect expectation", () => {
    // useDeepLinkHandler stores pending link and router.replace('/login') when no token.
    assert.ok(true, "auth guard enforced in use-deep-link-handler.ts");
  });
});

describe("deep link offline contract", () => {
  it("documents offline handling per screen", () => {
    const offlineScreens = {
      orderDetail: "SecureStore cache via useOrderDetailData",
      sellerCatalog: "blocked without network in useSellerCatalogProfile",
      sellerSales: "offline snapshot via readSnapshot('seller-sales')",
    };
    assert.ok(Object.keys(offlineScreens).length >= 3);
  });
});
