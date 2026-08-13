import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const create = vi.fn();
const update = vi.fn();
const constructEvent = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeWebhookEvent: {
      findUnique,
      create,
      update,
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent },
  }),
  isStripeConfigured: () => true,
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  }),
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

describe("Stripe webhook hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    constructEvent.mockReturnValue({
      id: "evt_test_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          mode: "payment",
          payment_status: "paid",
          metadata: { orderId: "ord_1" },
        },
      },
    });
  });

  it("rejects missing signature", async () => {
    const { handleStripeWebhook } = await import(
      "@/features/payments/webhook"
    );
    await expect(handleStripeWebhook("{}", null)).rejects.toThrow(
      /Stripe-Signature/,
    );
  });

  it("skips already PROCESSED events (idempotency)", async () => {
    findUnique.mockResolvedValue({
      id: "row1",
      stripeEventId: "evt_test_1",
      status: "PROCESSED",
      orderId: "ord_1",
    });
    const { handleStripeWebhook } = await import(
      "@/features/payments/webhook"
    );
    const result = await handleStripeWebhook("{}", "sig");
    expect(result.duplicate).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("records RECEIVED then PROCESSED on success", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({
      id: "row_new",
      stripeEventId: "evt_test_1",
      status: "RECEIVED",
    });
    update.mockResolvedValue({});
    const { handleStripeWebhook } = await import(
      "@/features/payments/webhook"
    );
    const result = await handleStripeWebhook("{}", "t=1,v1=abc");
    expect(result.handled).toBe(true);
    expect(result.orderId).toBe("ord_1");
    expect(create).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PROCESSED" }),
      }),
    );
  });
});
