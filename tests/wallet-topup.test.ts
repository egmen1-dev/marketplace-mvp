import { describe, expect, it } from "vitest";

import { creditWalletTopUpFromCheckoutSession } from "@/lib/lot-wallet/credit-topup";
import { createWalletTopUpCheckoutSession } from "@/lib/lot-wallet/topup";

describe("wallet top-up contract", () => {
  it("rejects non wallet checkout sessions", async () => {
    const result = await creditWalletTopUpFromCheckoutSession({
      id: "cs_test",
      metadata: { purpose: "order_payment" },
      amount_total: 500000,
    } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_wallet_top_up");
  });

  it("validates top-up amount bounds before Stripe", async () => {
    const result = await createWalletTopUpCheckoutSession({
      userId: "u1",
      email: "test@example.com",
      amountRub: 50,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/100/);
  });
});
