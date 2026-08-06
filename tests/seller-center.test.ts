import { OrderStatus, ProductStatus, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  canTransitionOrderStatus,
  getAllowedOrderTransitions,
  SELLER_ORDER_TRANSITIONS,
} from "@/features/seller/lib/order-transitions";
import { isLowStock, LOW_STOCK_THRESHOLD } from "@/features/orders/lib/inventory-sync";
import { isSellerCabinetPath } from "@/lib/constants";

describe("seller cabinet path guards", () => {
  it("treats cabinet routes as protected", () => {
    expect(isSellerCabinetPath("/seller")).toBe(true);
    expect(isSellerCabinetPath("/seller/dashboard")).toBe(true);
    expect(isSellerCabinetPath("/seller/products")).toBe(true);
    expect(isSellerCabinetPath("/seller/products/new")).toBe(true);
    expect(isSellerCabinetPath("/seller/orders")).toBe(true);
    expect(isSellerCabinetPath("/seller/settings")).toBe(true);
    expect(isSellerCabinetPath("/seller/analytics")).toBe(true);
  });

  it("treats public storefront as open", () => {
    expect(isSellerCabinetPath("/seller/demo-shop")).toBe(false);
    expect(isSellerCabinetPath("/seller/clxxxxxxxxxxxxxxxxxxxxxx")).toBe(false);
  });
});

describe("BUYER cannot open seller dashboard (session helper)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("requireSellerSession rejects BUYER", async () => {
    vi.doMock("@/auth", () => ({
      auth: vi.fn(async () => ({
        user: {
          id: "u_buyer",
          email: "buyer@demo.lot",
          name: "Buyer",
          role: UserRole.BUYER,
          sellerProfileId: null,
        },
      })),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        user: {
          findUnique: vi.fn(async () => ({
            id: "u_buyer",
            email: "buyer@demo.lot",
            name: "Buyer",
            image: null,
            role: UserRole.BUYER,
            sellerProfile: null,
          })),
        },
        sellerProfile: { findUnique: vi.fn() },
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { requireSellerSession, SellerRequiredError } = await import(
      "@/features/auth/session"
    );

    await expect(requireSellerSession()).rejects.toBeInstanceOf(
      SellerRequiredError,
    );
  });
});

describe("SELLER sees only own products (ownership)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("getOwnedProduct forbids foreign sellerId", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        product: {
          findUnique: vi.fn(async () => ({
            id: "p1",
            sellerId: "seller_a",
            name: "Item",
            slug: "item",
            description: null,
            price: { toNumber: () => 100 },
            compareAt: null,
            currency: "RUB",
            stock: 1,
            city: null,
            condition: "NEW",
            status: ProductStatus.ACTIVE,
            views: 0,
            favoritesCount: 0,
            createdAt: new Date(),
            sku: null,
            weight: null,
            lengthCm: null,
            widthCm: null,
            heightCm: null,
            seoTitle: null,
            seoDescription: null,
            category: null,
            images: [],
            seller: {
              id: "seller_a",
              storeName: "A",
              slug: "a",
              isVerified: false,
              user: { id: "u1", name: null, image: null },
            },
          })),
        },
      },
    }));

    const { getOwnedProduct, ProductServiceError } = await import(
      "@/features/products/queries"
    );

    await expect(getOwnedProduct("p1", "seller_b")).rejects.toMatchObject({
      name: "ProductServiceError",
      status: 403,
      code: "FORBIDDEN",
    });
    expect(ProductServiceError).toBeDefined();
  });
});

describe("order status transitions + history", () => {
  it("allows PAID → PROCESSING → SHIPPED → DELIVERED", () => {
    expect(
      canTransitionOrderStatus(
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
        UserRole.SELLER,
      ),
    ).toBe(true);
    expect(
      canTransitionOrderStatus(
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        UserRole.SELLER,
      ),
    ).toBe(true);
    expect(
      canTransitionOrderStatus(
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        UserRole.SELLER,
      ),
    ).toBe(true);
  });

  it("does not allow seller to set PAID", () => {
    expect(
      getAllowedOrderTransitions(OrderStatus.NEW, UserRole.SELLER),
    ).not.toContain(OrderStatus.PAID);
    expect(SELLER_ORDER_TRANSITIONS[OrderStatus.NEW]).toEqual([
      OrderStatus.CANCELLED,
    ]);
  });

  it("updateSellerOrderStatus writes history", async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const orderUpdate = vi.fn(async () => undefined);
    const historyCreate = vi.fn(async () => undefined);

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        order: {
          findUnique: vi.fn(async () => ({
            id: "ord_1",
            status: OrderStatus.PAID,
            items: [{ product: { sellerId: "seller_1" } }],
          })),
        },
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            order: { update: orderUpdate },
            orderStatusHistory: { create: historyCreate },
          };
          return fn(tx);
        },
      },
    }));

    const { updateSellerOrderStatus } = await import(
      "@/features/seller/queries"
    );

    const result = await updateSellerOrderStatus({
      orderId: "ord_1",
      toStatus: OrderStatus.PROCESSING,
      actorUserId: "user_1",
      actorRole: UserRole.SELLER,
      sellerProfileId: "seller_1",
      note: "В работу",
    });

    expect(result.status).toBe(OrderStatus.PROCESSING);
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "ord_1" },
      data: { status: OrderStatus.PROCESSING },
    });
    expect(historyCreate).toHaveBeenCalledWith({
      data: {
        orderId: "ord_1",
        fromStatus: OrderStatus.PAID,
        toStatus: OrderStatus.PROCESSING,
        changedByUserId: "user_1",
        note: "В работу",
      },
    });
  });

  it("rejects status change for foreign seller", async () => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        order: {
          findUnique: vi.fn(async () => ({
            id: "ord_1",
            status: OrderStatus.PAID,
            items: [{ product: { sellerId: "other" } }],
          })),
        },
        $transaction: vi.fn(),
      },
    }));

    const { updateSellerOrderStatus, SellerServiceError } = await import(
      "@/features/seller/queries"
    );

    await expect(
      updateSellerOrderStatus({
        orderId: "ord_1",
        toStatus: OrderStatus.PROCESSING,
        actorUserId: "user_1",
        actorRole: UserRole.SELLER,
        sellerProfileId: "seller_1",
      }),
    ).rejects.toBeInstanceOf(SellerServiceError);
  });
});

describe("inventory sync", () => {
  it("detects low stock", () => {
    expect(isLowStock(0)).toBe(false);
    expect(isLowStock(LOW_STOCK_THRESHOLD)).toBe(true);
    expect(isLowStock(LOW_STOCK_THRESHOLD + 1)).toBe(false);
  });

  it("maps availability labels", async () => {
    const { getInventoryAvailability } = await import(
      "@/features/orders/lib/inventory-sync"
    );
    expect(getInventoryAvailability(0)).toBe("OUT");
    expect(getInventoryAvailability(3)).toBe("LOW");
    expect(getInventoryAvailability(10)).toBe("IN_STOCK");
  });

  it("setInventoryQuantity clamps negatives to zero", async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const inventoryUpsert = vi.fn(async () => undefined);
    const productUpdate = vi.fn(async () => undefined);
    const historyCreate = vi.fn(async () => undefined);
    const inventoryFind = vi.fn(async () => ({ quantity: 4 }));
    const productFind = vi.fn(async () => ({ status: ProductStatus.ACTIVE }));

    const tx = {
      productInventory: {
        findUnique: inventoryFind,
        upsert: inventoryUpsert,
      },
      product: {
        update: productUpdate,
        findUnique: productFind,
      },
      inventoryHistory: { create: historyCreate },
    };

    const { setInventoryQuantity } = await import(
      "@/features/orders/lib/inventory-sync"
    );

    const result = await setInventoryQuantity(tx as never, {
      productId: "p1",
      quantity: -5,
      actorUserId: "u1",
    });

    expect(result).toEqual({ quantity: 0, delta: -4 });
    expect(inventoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ quantity: 0 }),
        update: { quantity: 0 },
      }),
    );
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { stock: 0 },
    });
  });

  it("setInventoryQuantity mirrors Product.stock and writes history", async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const inventoryUpsert = vi.fn(async () => undefined);
    const productUpdate = vi.fn(async () => undefined);
    const historyCreate = vi.fn(async () => undefined);
    const inventoryFind = vi.fn(async () => ({ quantity: 10 }));
    const productFind = vi.fn(async () => ({ status: ProductStatus.ACTIVE }));

    const tx = {
      productInventory: {
        findUnique: inventoryFind,
        upsert: inventoryUpsert,
      },
      product: {
        update: productUpdate,
        findUnique: productFind,
      },
      inventoryHistory: { create: historyCreate },
    };

    const { setInventoryQuantity } = await import(
      "@/features/orders/lib/inventory-sync"
    );

    const result = await setInventoryQuantity(tx as never, {
      productId: "p1",
      quantity: 7,
      actorUserId: "u1",
      note: "Корректировка",
    });

    expect(result).toEqual({ quantity: 7, delta: -3 });
    expect(inventoryUpsert).toHaveBeenCalled();
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { stock: 7 },
    });
    expect(historyCreate).toHaveBeenCalledWith({
      data: {
        productId: "p1",
        delta: -3,
        quantityAfter: 7,
        note: "Корректировка",
        actorUserId: "u1",
      },
    });
  });

  it("decrementInventory refuses oversell", async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const tx = {
      productInventory: {
        findUnique: vi.fn(async () => ({
          productId: "p1",
          quantity: 1,
          reservedQuantity: 0,
        })),
        updateMany: vi.fn(),
      },
      product: {
        findUnique: vi.fn(async () => ({ status: ProductStatus.ACTIVE })),
        update: vi.fn(),
      },
      inventoryHistory: { create: vi.fn() },
    };

    const { decrementInventory } = await import(
      "@/features/orders/lib/inventory-sync"
    );

    await expect(
      decrementInventory(tx as never, {
        productId: "p1",
        amount: 2,
      }),
    ).rejects.toThrow("OUT_OF_STOCK");
  });
});
