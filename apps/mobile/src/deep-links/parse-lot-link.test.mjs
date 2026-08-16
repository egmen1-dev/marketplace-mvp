import { describe, it } from "node:test";
import assert from "node:assert/strict";

function parseLotDeepLink(uri) {
  const trimmed = uri.trim();
  if (/^lot:\/\/home\/?$/i.test(trimmed)) return { screen: "home" };
  if (/^lot:\/\/wallet\/?$/i.test(trimmed)) return { screen: "wallet" };
  if (/^lot:\/\/orders\/?$/i.test(trimmed)) return { screen: "orders" };
  const product = trimmed.match(/^lot:\/\/product\/([^/?#]+)/i);
  if (product) return { screen: "product", productId: product[1] };
  const brain = trimmed.match(/^lot:\/\/brain\/product\/([^/?#]+)/i);
  if (brain) return { screen: "brainProduct", productId: brain[1] };
  return null;
}

describe("parseLotDeepLink", () => {
  it("parses product link", () => {
    const route = parseLotDeepLink("lot://product/abc-123");
    assert.equal(route.screen, "product");
    assert.equal(route.productId, "abc-123");
  });

  it("parses wallet and orders", () => {
    assert.equal(parseLotDeepLink("lot://wallet").screen, "wallet");
    assert.equal(parseLotDeepLink("lot://orders").screen, "orders");
  });

  it("parses brain product link", () => {
    const route = parseLotDeepLink("lot://brain/product/p-99");
    assert.equal(route.screen, "brainProduct");
    assert.equal(route.productId, "p-99");
  });

  it("returns null for unknown scheme", () => {
    assert.equal(parseLotDeepLink("https://example.com"), null);
  });
});
