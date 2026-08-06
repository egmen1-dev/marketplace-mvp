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

describe("C1 + M3 + webhook paid path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not commit inventory again when order already PAID (idempotent)", async () => {
    const prismaMod = await import("@/lib/prisma");
    const state = (prismaMod as unknown as { __mockState: {
      order: {
        id: string;
        userId: string;
        status: OrderStatus;
        total: Prisma.Decimal;
        currency: string;
        payment: { id: string; paidAt: Date | null } | null;
      } | null;
    } }).__mockState;

    state.order = {
      id: "ord_1",
      userId: "u1",
      status: OrderStatus.PAID,
      total: new Prisma.Decimal("100.00"),
      currency: "RUB",
      payment: { id: "pay_1", paidAt: new Date("2024-01-01") },
    };

    const { markOrderPaidFromCheckoutSession } = await import(
      "@/features/payments/create-checkout-session"
    );

    const session = {
      id: "cs_1",
      amount_total: 10_000,
      currency: "rub",
      metadata: { orderId: "ord_1" },
      client_reference_id: "ord_1",
      payment_intent: "pi_1",
    } as unknown as Stripe.Checkout.Session;

    const result = await markOrderPaidFromCheckoutSession(session);

    expect(result).toEqual({ orderId: "ord_1", alreadyPaid: true });
    expect(commitInventory).not.toHaveBeenCalled();
  });

  it("commits inventory and marks PAID when amount matches", async () => {
    vi.resetModules();
    // Re-apply mocks after resetModules
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
                payment: null,
              }),
              update: orderUpdate,
            },
            payment: {
              update: vi.fn(),
              upsert: paymentUpsert,
            },
          };
          return fn(tx);
        },
        payment: { findFirst: vi.fn() },
      },
    }));

    const { markOrderPaidFromCheckoutSession } = await import(
      "@/features/payments/create-checkout-session"
    );

    const session = {
      id: "cs_2",
      amount_total: 10_000,
      currency: "rub",
      metadata: { orderId: "ord_2" },
      client_reference_id: "ord_2",
      payment_intent: "pi_2",
    } as unknown as Stripe.Checkout.Session;

    const result = await markOrderPaidFromCheckoutSession(session);

    expect(result).toEqual({ orderId: "ord_2", alreadyPaid: false });
    expect(commitInventoryLocal).toHaveBeenCalledWith("ord_2", expect.anything());
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "ord_2" },
      data: { status: OrderStatus.PAID },
    });
    expect(paymentUpsert).toHaveBeenCalled();
  });

  it("rejects mark-paid when Stripe amount mismatches order total", async () => {
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

    const { markOrderPaidFromCheckoutSession } = await import(
      "@/features/payments/create-checkout-session"
    );
    const { PaymentServiceError } = await import(
      "@/features/payments/errors"
    );

    const session = {
      id: "cs_3",
      amount_total: 999,
      currency: "rub",
      metadata: { orderId: "ord_3" },
      client_reference_id: "ord_3",
      payment_intent: null,
    } as unknown as Stripe.Checkout.Session;

    await expect(markOrderPaidFromCheckoutSession(session)).rejects.toBeInstanceOf(
      PaymentServiceError,
    );
    expect(commitInventoryLocal).not.toHaveBeenCalled();
  });
});

describe("C1 inventory helpers", () => {
  it("reserveInventory is a no-op (does not touch stock)", async () => {
    vi.resetModules();
    vi.doUnmock("@/features/orders/lib/inventory");
    const { reserveInventory, releaseInventory } = await import(
      "@/features/orders/lib/inventory"
    );
    await expect(reserveInventory("ord_x")).resolves.toBeUndefined();
    await expect(releaseInventory("ord_x")).resolves.toBeUndefined();
  });
});

// silence unused PaymentStatus import in some bundlers
void PaymentStatus;
