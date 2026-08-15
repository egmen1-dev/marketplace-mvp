import { beforeEach, describe, expect, it, vi } from "vitest";

const walletUpdate = vi.fn();
const appendLedger = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        userWallet: { update: walletUpdate },
      }),
  },
}));

vi.mock("@/lib/lot-wallet/queries", () => ({
  getOrCreateUserWallet: vi.fn(async () => ({})),
  appendWalletLedgerEntry: (...args: unknown[]) => appendLedger(...args),
}));

describe("wallet top-up idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not double-credit when ledger idempotency key already exists", async () => {
    appendLedger.mockResolvedValue(false);
    const { creditWalletTopUpFromCheckoutSession } = await import(
      "@/lib/lot-wallet/credit-topup"
    );
    const result = await creditWalletTopUpFromCheckoutSession({
      id: "cs_test_dup",
      metadata: { purpose: "wallet_top_up", userId: "user_1" },
      amount_total: 500_000,
    } as never);
    expect(result.ok).toBe(true);
    expect(walletUpdate).not.toHaveBeenCalled();
  });

  it("credits wallet once when ledger entry is created", async () => {
    appendLedger.mockResolvedValue(true);
    const { creditWalletTopUpFromCheckoutSession } = await import(
      "@/lib/lot-wallet/credit-topup"
    );
    const result = await creditWalletTopUpFromCheckoutSession({
      id: "cs_test_ok",
      metadata: { purpose: "wallet_top_up", userId: "user_1" },
      amount_total: 500_000,
    } as never);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.amount).toBe(5000);
    expect(walletUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { topupSpendableAmount: { increment: 5000 } },
      }),
    );
  });
});
