import { ProductStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Order NEW must not decrement stock — only finalizePaidOrder / commitInventory does.
 */
describe("createOrderFromCart stock policy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("createOrderFromCart does not call commitInventory or decrement stock", async () => {
    const productUpdate = vi.fn();
    const inventoryUpdate = vi.fn();
    const commitInventory = vi.fn();

    vi.doMock("@/features/orders/lib/inventory", () => ({
      commitInventory,
      InventoryError: class InventoryError extends Error {},
    }));

    vi.doMock("@/lib/delivery", () => ({
      DeliveryError: class DeliveryError extends Error {},
      getDeliveryProvider: () => ({
        getQuote: async () => ({
          cost: 300,
          estimatedMinDays: 2,
          estimatedMaxDays: 5,
        }),
      }),
    }));

    const cartItems = [
      {
        productId: "prod_1",
        quantity: 2,
        product: {
          id: "prod_1",
          name: "Товар",
          sku: "SKU",
          price: { mul: (n: number) => ({ value: 100 * n }) },
          currency: "RUB",
          stock: 10,
          status: ProductStatus.ACTIVE,
        },
      },
    ];

    // Decimal-like stubs
    const Decimal = (await import("@prisma/client")).Prisma.Decimal;

    cartItems[0]!.product.price = new Decimal("100.00") as never;

    let orderCreated = false;

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        cart: {
          findUnique: async () => ({
            id: "cart_1",
            userId: "u1",
            items: cartItems,
          }),
        },
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            product: {
              findUnique: async () => ({
                id: "prod_1",
                name: "Товар",
                stock: 10,
                status: ProductStatus.ACTIVE,
              }),
              update: productUpdate,
            },
            productInventory: {
              update: inventoryUpdate,
              updateMany: inventoryUpdate,
            },
            address: {
              create: async () => ({ id: "addr_1" }),
            },
            order: {
              create: async (args: { data: { status: string } }) => {
                orderCreated = true;
                expect(args.data.status).toBe("NEW");
                return {
                  id: "ord_new",
                  orderNumber: "ORD-TEST",
                  status: "NEW",
                };
              },
            },
            delivery: { create: async () => ({}) },
            cartItem: { deleteMany: async () => ({ count: 1 }) },
            cart: { update: async () => ({}) },
          };
          return fn(tx);
        },
      },
    }));

    const { createOrderFromCart } = await import(
      "@/features/orders/queries"
    );

    const result = await createOrderFromCart("u1", {
      fullName: "Test User",
      phone: "+79990001122",
      city: "Москва",
      street: "Тверская 1",
      fulfillmentType: "DELIVERY",
      deliveryMethod: "COURIER",
      pickupPointId: "",
      pickupAddress: "",
      sellerPickupPointId: "",
      notes: "",
    });

    expect(result.ok).toBe(true);
    expect(orderCreated).toBe(true);
    expect(commitInventory).not.toHaveBeenCalled();
    expect(productUpdate).not.toHaveBeenCalled();
    expect(inventoryUpdate).not.toHaveBeenCalled();
  });
});
