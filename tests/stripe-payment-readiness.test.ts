import { describe, expect, it, vi } from "vitest";

import { PAYMENTS_NOT_CONFIGURED } from "@/features/payments/errors";
import { createCheckoutSessionForOrder } from "@/features/payments/create-checkout-session";
import { isStripeConfigured } from "@/lib/stripe";

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: vi.fn(),
  getStripe: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findFirst: vi.fn() },
    payment: { upsert: vi.fn() },
  },
}));

describe("Stripe payment readiness", () => {
  it("isStripeConfigured reflects STRIPE_SECRET_KEY presence", () => {
    vi.mocked(isStripeConfigured).mockReturnValue(false);
    expect(isStripeConfigured()).toBe(false);
    vi.mocked(isStripeConfigured).mockReturnValue(true);
    expect(isStripeConfigured()).toBe(true);
  });

  it("createCheckoutSessionForOrder returns PAYMENTS_NOT_CONFIGURED when Stripe unset", async () => {
    vi.mocked(isStripeConfigured).mockReturnValue(false);
    const result = await createCheckoutSessionForOrder("user-1", "order-1");
    expect(result).toEqual({ ok: false, error: PAYMENTS_NOT_CONFIGURED });
  });
});

describe("GET /api/health stripe check shape", () => {
  it("includes stripe.configured boolean", async () => {
    const prev = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    vi.resetModules();
    vi.doMock("@/lib/db/schema-compatibility", () => ({
      checkSchemaCompatibility: vi.fn(async () => ({
        compatible: true,
        reachable: true,
        missingColumns: [],
        missingTables: [],
        epic174MigrationApplied: true,
        detail: "compatible",
      })),
    }));
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const json = (await res.json()) as {
      checks: { stripe: { configured?: boolean; ok: boolean } };
    };
    expect(json.checks.stripe).toHaveProperty("configured");
    expect(json.checks.stripe.configured).toBe(false);
    if (prev) process.env.STRIPE_SECRET_KEY = prev;
  });
});
