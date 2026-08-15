import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const create = vi.fn();
const update = vi.fn();
const constructEvent = vi.fn();
const creditTopUp = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeWebhookEvent: { findUnique, create, update },
  },
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
  isStripeConfigured: () => true,
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ STRIPE_WEBHOOK_SECRET: "whsec_test" }),
}));

vi.mock("@/features/payments/create-checkout-session", () => ({
  markOrderPaidFromCheckoutSession: vi.fn(async () => ({
    orderId: "ord_1",
    alreadyPaid: false,
  })),
  markOrderPaidFromPaymentIntent: vi.fn(async () => ({
    orderId: "ord_1",
    alreadyPaid: false,
  })),
}));

vi.mock("@/lib/lot-wallet/credit-topup", () => ({
  creditWalletTopUpFromCheckoutSession: (...args: unknown[]) => creditTopUp(...args),
}));

describe("wallet webhook idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    creditTopUp.mockResolvedValue({ ok: true, userId: "u1", amount: 5000 });
    constructEvent.mockReturnValue({
      id: "evt_wallet_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_wallet",
          mode: "payment",
          payment_status: "paid",
          metadata: { purpose: "wallet_top_up", userId: "u1" },
        },
      },
    });
  });

  it("routes wallet top-up checkout to creditWalletTopUpFromCheckoutSession", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "row1", stripeEventId: "evt_wallet_1" });
    update.mockResolvedValue({});
    const { handleStripeWebhook } = await import("@/features/payments/webhook");
    await handleStripeWebhook("{}", "sig");
    expect(creditTopUp).toHaveBeenCalled();
  });

  it("skips duplicate PROCESSED wallet events", async () => {
    findUnique.mockResolvedValue({
      id: "row1",
      stripeEventId: "evt_wallet_1",
      status: "PROCESSED",
    });
    const { handleStripeWebhook } = await import("@/features/payments/webhook");
    const result = await handleStripeWebhook("{}", "sig");
    expect(result.duplicate).toBe(true);
    expect(creditTopUp).not.toHaveBeenCalled();
  });
});
