import { beforeEach, describe, expect, it } from "vitest";

import { useCartStore } from "../apps/mobile/src/commerce/cart-store";

describe("cart-store — canonical quantity source", () => {
  beforeEach(() => {
    useCartStore.setState({ quantities: {}, pending: {}, hydrated: false });
  });

  it("applyFromCart sets quantities from API lines", () => {
    useCartStore.getState().applyFromCart([
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ]);
    expect(useCartStore.getState().getQuantity("p1")).toBe(2);
    expect(useCartStore.getState().getQuantity("p2")).toBe(1);
    expect(useCartStore.getState().getQuantity("missing")).toBe(0);
  });

  it("setQuantityLocal removes key at zero", () => {
    useCartStore.getState().setQuantityLocal("p1", 3);
    expect(useCartStore.getState().getQuantity("p1")).toBe(3);
    useCartStore.getState().setQuantityLocal("p1", 0);
    expect(useCartStore.getState().getQuantity("p1")).toBe(0);
    expect(useCartStore.getState().quantities.p1).toBeUndefined();
  });
});

describe("cart quantity flow — contracts", () => {
  it("useCommerceActions exposes increment/decrement/setters", async () => {
    const source = await import("fs/promises").then((fs) =>
      fs.readFile("apps/mobile/src/hooks/useCommerceActions.ts", "utf8"),
    );
    expect(source).toContain("setProductCartQuantity");
    expect(source).toContain("incrementProductCart");
    expect(source).toContain("decrementProductCart");
    expect(source).toContain("setQuantityLocal");
    expect(source).toContain("previous");
  });

  it("refreshTabBadges applies cart to store in one fetch", async () => {
    const source = await import("fs/promises").then((fs) =>
      fs.readFile("apps/mobile/src/commerce/refresh-tab-badges.ts", "utf8"),
    );
    expect(source).toContain("applyFromCart");
    expect(source).toContain("fetchCart");
    expect(source).not.toMatch(/for\s*\(.*ProductCard/);
  });

  it("ConnectedProductCard uses shared commerce hook", async () => {
    const source = await import("fs/promises").then((fs) =>
      fs.readFile("apps/mobile/src/components/ui/ProductCard.tsx", "utf8"),
    );
    expect(source).toContain("useProductCardCommerce");
    expect(source).toContain("ConnectedProductCard");
  });
});
