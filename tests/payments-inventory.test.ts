import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const commitInventory = vi.fn(async () => undefined);

vi.mock("@/features/orders/lib/inventory", () => ({
  commitInventory,
  InventoryError: class InventoryError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 409) {
      super(message);
      this.code = code;
      this.status = status;
      this.name = "InventoryError";
    }
  },
}));

vi.mock("@/lib/prisma", () => {
  const state = {
    order: null as null | {
      id: string;
      userId: string;
      status: OrderStatus;
      total: Prisma.Decimal;
      currency: string;
      payment: {
        id: string;
        status: PaymentStatus;
        paidAt: Date | null;
      } | null;
    },
    paymentUpdate: vi.fn(),
    paymentUpsert: vi.fn(),
    orderUpdate: vi.fn(),
  };

  return {
    __mockState: state,
    prisma: {
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          order: {
            findUnique: async () => state.order,
            update: state.orderUpdate,
          },
          payment: {
            update: state.paymentUpdate,
            upsert: state.paymentUpsert,
          },
        };
        return fn(tx);
      },
      payment: {
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("finalizePaidOrder / webhook paid path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not commit inventory again when order already PAID (idempotent)", async () => {
    const prismaMod = await import("@/lib/prisma");
    const state = (
      prismaMod as unknown as {
        __mockState: {
          order: {
            id: string;
            userId: string;
            status: OrderStatus;
            total: Prisma.Decimal;
            currency: string;
            payment: {
              id: string;
              status: PaymentStatus;
              paidAt: Date | null;
            } | null;
          } | null;
        };
      }
    ).__mockState;

    state.order = {
      id: "ord_1",
      userId: "u1",
      status: OrderStatus.PAID,
      total: new Prisma.Decimal("100.00"),
      currency: "RUB",
      payment: {
        id: "pay_1",
        status: PaymentStatus.SUCCEEDED,
        paidAt: new Date("2024-01-01"),
      },
    };

    const { finalizePaidOrder } = await import(
      "@/features/orders/lib/finalize-paid-order"
    );

    const result = await finalizePaidOrder({
      orderId: "ord_1",
      amountTotal: 10_000,
      currency: "rub",
      stripeSessionId: "cs_1",
      stripePaymentIntentId: "pi_1",
      source: "checkout.session",
    });

    expect(result).toEqual({ orderId: "ord_1", alreadyPaid: true });
    expect(commitInventory).not.toHaveBeenCalled();
  });

  it("commits inventory and marks awaiting confirmation when amount + currency match", async () => {
    vi.resetModules();
    const commitInventoryLocal = vi.fn(async () => undefined);
    vi.doMock("@/features/orders/lib/inventory", () => ({
      commitInventory: commitInventoryLocal,
      InventoryError: class InventoryError extends Error {
        code: string;
        status: number;
        constructor(code: string, message: string, status = 409) {
          super(message);
          this.code = code;
          this.status = status;
          this.name = "InventoryError";
        }
      },
    }));

    const orderUpdate = vi.fn();
    const paymentUpsert = vi.fn();
    const historyCreate = vi.fn(async () => ({ id: "hist_1" }));
    const eventCreate = vi.fn(async () => ({ id: "evt_1" }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            order: {
              findUnique: async () => ({
                id: "ord_2",
                userId: "u1",
                status: OrderStatus.NEW,
                total: new Prisma.Decimal("100.00"),
                currency: "RUB",
                fulfillmentType: "DELIVERY",
                handlingDays: 2,
                pickupExpiresAt: null,
                payment: null,
                delivery: { estimatedMaxDays: 3 },
                items: [],
              }),
              update: orderUpdate,
            },
            payment: {
              update: vi.fn(),
              upsert: paymentUpsert,
            },
            orderStatusHistory: { create: historyCreate },
            orderEvent: { create: eventCreate },
          };
          return fn(tx);
        },
        payment: { findFirst: vi.fn() },
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { finalizePaidOrder } = await import(
      "@/features/orders/lib/finalize-paid-order"
    );

    const result = await finalizePaidOrder({
      orderId: "ord_2",
      amountTotal: 10_000,
      currency: "rub",
      stripeSessionId: "cs_2",
      source: "checkout.session",
    });

    expect(result).toEqual({ orderId: "ord_2", alreadyPaid: false });
    expect(commitInventoryLocal).toHaveBeenCalledWith(
      "ord_2",
      expect.anything(),
    );
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ord_2" },
        data: expect.objectContaining({
          status: OrderStatus.AWAITING_SELLER_CONFIRMATION,
        }),
      }),
    );
    expect(paymentUpsert).toHaveBeenCalled();
    expect(historyCreate).toHaveBeenCalled();
  });

  it("rejects when Stripe amount mismatches order total (no PAID, no stock)", async () => {
    vi.resetModules();
    const commitInventoryLocal = vi.fn(async () => undefined);
    vi.doMock("@/features/orders/lib/inventory", () => ({
      commitInventory: commitInventoryLocal,
      InventoryError: class InventoryError extends Error {
        code: string;
        status: number;
        constructor(code: string, message: string, status = 409) {
          super(message);
          this.code = code;
          this.status = status;
          this.name = "InventoryError";
        }
      },
    }));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            order: {
              findUnique: async () => ({
                id: "ord_3",
                userId: "u1",
                status: OrderStatus.NEW,
                total: new Prisma.Decimal("100.00"),
                currency: "RUB",
                payment: null,
              }),
              update: vi.fn(),
            },
            payment: { update: vi.fn(), upsert: vi.fn() },
          };
          return fn(tx);
        },
        payment: { findFirst: vi.fn() },
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { finalizePaidOrder } = await import(
      "@/features/orders/lib/finalize-paid-order"
    );
    const { PaymentServiceError } = await import("@/features/payments/errors");

    await expect(
      finalizePaidOrder({
        orderId: "ord_3",
        amountTotal: 999,
        currency: "rub",
        stripeSessionId: "cs_3",
        source: "checkout.session",
      }),
    ).rejects.toBeInstanceOf(PaymentServiceError);
    expect(commitInventoryLocal).not.toHaveBeenCalled();
  });

  it("rejects currency mismatch", async () => {
    vi.resetModules();
    const commitInventoryLocal = vi.fn(async () => undefined);
    vi.doMock("@/features/orders/lib/inventory", () => ({
      commitInventory: commitInventoryLocal,
      InventoryError: class InventoryError extends Error {
        code: string;
        status: number;
        constructor(code: string, message: string, status = 409) {
          super(message);
          this.code = code;
          this.status = status;
          this.name = "InventoryError";
        }
      },
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            order: {
              findUnique: async () => ({
                id: "ord_4",
                userId: "u1",
                status: OrderStatus.NEW,
                total: new Prisma.Decimal("100.00"),
                currency: "RUB",
                payment: null,
              }),
              update: vi.fn(),
            },
            payment: { update: vi.fn(), upsert: vi.fn() },
          };
          return fn(tx);
        },
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { finalizePaidOrder } = await import(
      "@/features/orders/lib/finalize-paid-order"
    );
    await import("@/features/payments/errors");

    await expect(
      finalizePaidOrder({
        orderId: "ord_4",
        amountTotal: 10_000,
        currency: "usd",
        source: "checkout.session",
      }),
    ).rejects.toMatchObject({ code: "CURRENCY_MISMATCH" });
    expect(commitInventoryLocal).not.toHaveBeenCalled();
  });

  it("markOrderPaidFromCheckoutSession wires metadata order id", async () => {
    vi.resetModules();
    const finalizePaidOrder = vi.fn(async () => ({
      orderId: "ord_meta",
      alreadyPaid: false,
    }));
    vi.doMock("@/features/orders/lib/finalize-paid-order", () => ({
      finalizePaidOrder,
      finalizeInputFromCheckoutSession: (
        session: Stripe.Checkout.Session,
        orderId: string,
      ) => ({
        orderId,
        amountTotal: session.amount_total,
        currency: session.currency,
        stripeSessionId: session.id,
        source: "checkout.session" as const,
      }),
      finalizeInputFromPaymentIntent: vi.fn(),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: { payment: { findFirst: vi.fn() } },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));
    vi.doMock("@/lib/env", () => ({
      getEnv: () => ({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" }),
      getCanonicalAppUrl: () => "http://localhost:3000",
    }));
    vi.doMock("@/lib/stripe", () => ({
      getStripe: vi.fn(),
      isStripeConfigured: () => true,
    }));

    const { markOrderPaidFromCheckoutSession } = await import(
      "@/features/payments/create-checkout-session"
    );

    const session = {
      id: "cs_meta",
      amount_total: 10_000,
      currency: "rub",
      metadata: { orderId: "ord_meta" },
      client_reference_id: null,
      payment_intent: null,
    } as unknown as Stripe.Checkout.Session;

    const result = await markOrderPaidFromCheckoutSession(session);
    expect(result.orderId).toBe("ord_meta");
    expect(finalizePaidOrder).toHaveBeenCalled();
  });
});

describe("inventory helpers", () => {
  it("does not export fake reserveInventory", async () => {
    vi.resetModules();
    vi.doUnmock("@/features/orders/lib/inventory");
    const inv = await import("@/features/orders/lib/inventory");
    expect("reserveInventory" in inv).toBe(false);
    expect("releaseInventory" in inv).toBe(false);
    expect(typeof inv.commitInventory).toBe("function");
  });
});

describe("decrementInventory atomic guard", () => {
  it("throws OUT_OF_STOCK when quantity insufficient (no negative)", async () => {
    vi.resetModules();
    const { decrementInventory } = await import(
      "@/features/orders/lib/inventory-sync"
    );

    const tx = {
      productInventory: {
        findUnique: vi.fn(async () => ({
          productId: "p1",
          quantity: 1,
          reservedQuantity: 0,
        })),
        updateMany: vi.fn(async () => ({ count: 0 })),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
      },
      product: {
        findUnique: vi.fn(async () => ({ status: "ACTIVE", stock: 1 })),
        update: vi.fn(),
      },
      inventoryHistory: { create: vi.fn() },
    };

    await expect(
      decrementInventory(tx as never, { productId: "p1", amount: 2 }),
    ).rejects.toThrow("OUT_OF_STOCK");
  });
});

void PaymentStatus;
