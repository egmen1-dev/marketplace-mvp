import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { detectCrudInSource } from "@/lib/product-operations/marketplace-quality/crud-detection";
import { enrichAuditFile, loadMarketplaceQualityAudit } from "@/lib/product-operations/marketplace-quality/report";
import { computeMarketplaceFeeling, computeMarketplaceScore } from "@/lib/product-operations/marketplace-quality/criteria";

describe("EPIC 84 Sprint 5 — Cart & Checkout", () => {
  it("cart shell uses CartExperience module", () => {
    const source = readFileSync("apps/mobile/app/cart.tsx", "utf8");
    expect(source).toContain("CartExperience");
    expect(source).not.toContain("fetchCart");
  });

  it("checkout shell uses CheckoutExperience module", () => {
    const source = readFileSync("apps/mobile/app/checkout.tsx", "utf8");
    expect(source).toContain("CheckoutExperience");
    expect(source).not.toContain("Alpha использует backend checkout contract");
  });

  it("cart experience has commerce layout blocks", () => {
    const source = readFileSync("apps/mobile/src/features/cart-checkout/CartExperience.tsx", "utf8");
    expect(source).toContain("CartSummaryBar");
    expect(source).toContain("CartStickyCheckoutCta");
    expect(source).toContain("CartEmptyState");
    expect(source).not.toContain("Alert.alert");
  });

  it("checkout uses honest alpha handoff", () => {
    const hook = readFileSync("apps/mobile/src/features/cart-checkout/useCheckoutData.ts", "utf8");
    expect(hook).toContain("checkout_alpha_redirect");
    expect(hook).not.toContain("checkout_completed");
  });

  it("cart and checkout files pass CRUD detection", () => {
    for (const file of [
      "apps/mobile/app/cart.tsx",
      "apps/mobile/app/checkout.tsx",
      "apps/mobile/src/features/cart-checkout/CartExperience.tsx",
      "apps/mobile/src/features/cart-checkout/CheckoutExperience.tsx",
    ]) {
      expect(detectCrudInSource(file).fail).toBe(false);
    }
  });

  it("meets sprint gate marketplace scores for cart and checkout", () => {
    const audit = enrichAuditFile(loadMarketplaceQualityAudit());
    const cart = audit.screens.find((s) => s.screenId === "cart");
    const checkout = audit.screens.find((s) => s.screenId === "checkout");
    expect(cart?.scoresAfter).toBeTruthy();
    expect(checkout?.scoresAfter).toBeTruthy();
    expect(computeMarketplaceScore(cart!.scoresAfter!)).toBeGreaterThanOrEqual(9.6);
    expect(computeMarketplaceFeeling(cart!.scoresAfter!)).toBeGreaterThanOrEqual(9.7);
    expect(computeMarketplaceScore(checkout!.scoresAfter!)).toBeGreaterThanOrEqual(9.6);
    expect(computeMarketplaceFeeling(checkout!.scoresAfter!)).toBeGreaterThanOrEqual(9.7);
  });
});
