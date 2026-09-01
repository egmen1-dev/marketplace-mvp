import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { correlateCheckoutReturnOrder, extractOrderIdFromLotDeepLink } from "../apps/mobile/src/commerce/checkout-return";
import { CART_CHECKOUT_TRANSITION_LOADING_LABEL } from "../apps/mobile/src/cart/ui/checkout-transition-copy";
import { moderationStatusLabel, productStatusLabel } from "../apps/mobile/src/theme/status-labels";

const favoritesSource = readFileSync("apps/mobile/app/(tabs)/favorites.tsx", "utf8");
const cartCheckoutBarSource = readFileSync("apps/mobile/src/cart/ui/CartCheckoutBar.tsx", "utf8");
const cartSource = readFileSync("apps/mobile/app/cart.tsx", "utf8");
const sellSource = readFileSync("apps/mobile/app/(tabs)/sell.tsx", "utf8");
const checkoutReturnSource = readFileSync("apps/mobile/src/hooks/useCheckoutReturnRefresh.ts", "utf8");
const webHandoffRefreshSource = readFileSync("apps/mobile/src/hooks/useWebHandoffSessionRefresh.ts", "utf8");
const clientSource = readFileSync("apps/mobile/src/api/client.ts", "utf8");
const checkoutSource = readFileSync("apps/mobile/app/checkout.tsx", "utf8");
const chatTestSource = readFileSync("tests/mobile-chat.test.ts", "utf8");
const statusLabelsSource = readFileSync("apps/mobile/src/theme/status-labels.ts", "utf8");

describe("RC27 preflight polish", () => {
  it("RC27-POLISH-01 Favorites uses canonical ProductCard", () => {
    expect(favoritesSource).toContain('from "../../src/commerce/product-card"');
    expect(favoritesSource).toContain("<ProductCard");
    expect(favoritesSource).toContain('variant="grid"');
    expect(favoritesSource).not.toMatch(/ProductCard.*from "\.\.\/\.\.\/src\/components\/ui"/);
  });

  it("RC27-POLISH-02 Favorites cart state remains shared", () => {
    expect(favoritesSource).toContain("isCartBusy={isCartBusy(item.id)}");
    expect(favoritesSource).toContain("addProductToCart");
    expect(favoritesSource).toContain("incrementProductCart");
    expect(favoritesSource).toContain("decrementProductCart");
  });

  it("RC27-POLISH-03 Favorites favorite state remains shared", () => {
    expect(favoritesSource).toContain("isFavorite={isFavorite(item.id)}");
    expect(favoritesSource).toContain("isFavoriteBusy={isFavoriteBusy(item.id)}");
    expect(favoritesSource).toContain("toggleProductFavorite");
  });

  it("RC27-POLISH-04 Cart checkout transition does not claim order creation", () => {
    expect(CART_CHECKOUT_TRANSITION_LOADING_LABEL).toBe("Переходим к оформлению…");
    expect(cartCheckoutBarSource).toContain("CART_CHECKOUT_TRANSITION_LOADING_LABEL");
    expect(cartSource).toContain("CART_CHECKOUT_TRANSITION_LOADING_LABEL");
    expect(cartCheckoutBarSource).not.toContain("Создание заказа…");
    expect(cartSource).not.toContain("Создание заказа…");
  });

  it("RC27-POLISH-05 sellerCapable refreshes after supported onboarding return", () => {
    expect(webHandoffRefreshSource).toContain("refreshSessionRole");
    expect(webHandoffRefreshSource).toContain("setUserRole");
    expect(sellSource).toContain('setPendingWebHandoff("seller")');
    expect(clientSource).toContain("export async function refreshSessionRole");
  });

  it("RC27-POLISH-06 seller entry becomes available without relogin", () => {
    expect(sellSource).toContain("sellerCapable");
    expect(webHandoffRefreshSource).toContain("pendingWebHandoff");
  });

  it("RC27-POLISH-07 checkout return correlates specific order", () => {
    expect(checkoutReturnSource).toContain("correlateCheckoutReturnOrder");
    expect(checkoutReturnSource).toContain("extractOrderIdFromLotDeepLink");
    expect(checkoutSource).toContain("setCheckoutHandoff");
    expect(checkoutSource).toContain("knownOrderIds");
  });

  it("RC27-POLISH-08 checkout return does not use orders[0] as success truth", () => {
    expect(checkoutReturnSource).not.toContain("items[0]");
    expect(checkoutReturnSource).toContain("correlateCheckoutReturnOrder");
  });

  it("RC27-POLISH-09 known LOT status labels preserved", () => {
    expect(productStatusLabel("ACTIVE")).toBe("Активный");
    expect(productStatusLabel("DRAFT")).toBe("Сохранён");
    expect(moderationStatusLabel("PENDING_REVIEW")).toBe("На проверке");
    expect(statusLabelsSource).toContain('ACTIVE: "Активный"');
  });

  it("RC27-POLISH-10 unknown LOT enum not exposed raw", () => {
    expect(productStatusLabel("MYSTERY_BACKEND_STATUS")).toBe("Статус обновляется");
    expect(moderationStatusLabel("UNKNOWN_MOD_STATE")).toBe("Статус обновляется");
    expect(statusLabelsSource).not.toMatch(/MYSTERY_BACKEND_STATUS/);
  });

  it("RC27-POLISH-11 current chat test reflects accepted runtime behavior", () => {
    expect(chatTestSource).toContain("ProductSellerCard.tsx");
    expect(chatTestSource).toContain("Написать продавцу");
    expect(chatTestSource).toContain("openProductConversation");
  });
});

describe("RC27 checkout return correlation", () => {
  it("prefers explicit lot://order/{id} deep link", () => {
    expect(extractOrderIdFromLotDeepLink("lot://order/ord_123")).toBe("ord_123");
  });

  it("correlates only orders created after handoff snapshot", () => {
    const correlated = correlateCheckoutReturnOrder(
      [
        { id: "old-1", createdAt: "2026-01-01T10:00:00.000Z" },
        { id: "new-1", createdAt: "2026-01-01T12:00:05.000Z" },
      ],
      { startedAt: Date.parse("2026-01-01T12:00:00.000Z"), knownOrderIds: ["old-1"] },
    );

    expect(correlated?.id).toBe("new-1");
  });
});
