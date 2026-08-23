import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildBuyerOrderProgressSteps,
  formatMobileBuyerOrderStatus,
  toMobileBuyerOrderStatus,
} from "@/lib/mobile/buyer-order-status";

const checkoutEnter = readFileSync("app/api/mobile/checkout/enter/route.ts", "utf8");
const ordersSource = readFileSync("apps/mobile/app/(tabs)/orders.tsx", "utf8");
const orderDetailSource = readFileSync("apps/mobile/app/order/[id].tsx", "utf8");
const checkoutSource = readFileSync("apps/mobile/app/checkout.tsx", "utf8");
const cartSource = readFileSync("apps/mobile/app/cart.tsx", "utf8");
const checkoutFormSource = readFileSync("features/orders/components/checkout-form.tsx", "utf8");
const checkoutLockSource = readFileSync("features/orders/lib/checkout-lock.ts", "utf8");
const routeMapSource = readFileSync("apps/mobile/src/deep-links/native-route-map.ts", "utf8");
const sellerStorefrontSource = readFileSync("apps/mobile/app/seller/[id].tsx", "utf8");
const guideSource = readFileSync("docs/product/CLOSED_BETA_TESTER_GUIDE.md", "utf8");
const chatSource = readFileSync("features/chat/queries.ts", "utf8");

describe("EPIC 154 — closed beta critical path", () => {
  it("sets mobile return cookie on checkout handoff", () => {
    expect(checkoutEnter).toContain("MOBILE_RETURN_COOKIE");
    expect(checkoutEnter).toContain("returnDeepLink");
  });

  it("maps lot://order/{id} to native order detail with success flag", () => {
    expect(routeMapSource).toContain("/order/${parsed.orderId}?checkoutSuccess=1");
  });

  it("checkout screen blocks duplicate submit while opening browser", () => {
    expect(checkoutSource).toContain("Создание заказа…");
    expect(checkoutSource).toContain("disabled={opening}");
  });

  it("cart checkout button shows creating state", () => {
    expect(cartSource).toContain("Создание заказа…");
    expect(cartSource).toContain("checkoutLoading");
  });

  it("web checkout form disables submit while pending", () => {
    expect(checkoutFormSource).toContain("Создание заказа…");
    expect(checkoutFormSource).toContain("checkoutIdempotencyKey");
    expect(checkoutFormSource).toContain("disabled={!canPay || walletInsufficient || pending}");
  });

  it("serializes order creation per user in database", () => {
    expect(checkoutLockSource).toContain("pg_advisory_xact_lock");
  });

  it("buyer orders show human-readable status and success banner", () => {
    expect(ordersSource).toContain("formatBuyerOrderStatus");
    expect(ordersSource).toContain("Заказ оформлен");
    expect(ordersSource).toContain("В каталог");
  });

  it("order detail shows progress timeline markers", () => {
    expect(orderDetailSource).toContain("buildBuyerOrderTimeline");
    expect(orderDetailSource).toContain("✓");
    expect(orderDetailSource).toContain("●");
  });

  it("seller storefront shows trust block without fake metrics", () => {
    expect(sellerStorefrontSource).toContain("fetchSellerStorefront");
    expect(sellerStorefrontSource).toContain("Новый продавец");
    expect(sellerStorefrontSource).toContain("Ответы в чате");
    expect(sellerStorefrontSource).not.toMatch(/рейтинг|продаж/i);
  });

  it("beta tester guide documents demo accounts", () => {
    expect(guideSource).toContain("buyer@demo.lot");
    expect(guideSource).toContain("seller@demo.lot");
    expect(guideSource).toContain("demo1234");
  });

  it("maps prisma statuses to mobile buyer buckets", () => {
    expect(toMobileBuyerOrderStatus("PAID")).toBe("PENDING");
    expect(formatMobileBuyerOrderStatus("CONFIRMED")).toBe("Продавец принял заказ");
    expect(formatMobileBuyerOrderStatus("SHIPPED")).toBe("Передан в доставку");
    const steps = buildBuyerOrderProgressSteps("CONFIRMED");
    expect(steps.some((s) => s.label === "Заказ создан" && s.reached)).toBe(true);
  });

  it("order created chat message includes order number", () => {
    expect(chatSource).toContain("Создан новый заказ #");
  });
});
