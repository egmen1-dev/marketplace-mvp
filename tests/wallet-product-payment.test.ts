import { describe, expect, it, vi, beforeEach } from "vitest";

const appendLedger = vi.fn();
const walletUpdate = vi.fn();
const reverseAvailable = vi.fn();

vi.mock("@/lib/lot-wallet/flags", () => ({ isLotWalletEnabled: () => true }));

vi.mock("@/lib/lot-wallet/queries", () => ({
  getOrCreateUserWallet: vi.fn(async () => ({
    topupSpendableAmount: 5000,
    bonusSpendableAmount: 0,
  })),
  getWalletOverview: vi.fn(async () => ({
    enabled: true,
    buckets: {
      spendableAmount: 5000,
      withdrawableAmount: 0,
      topupAmount: 5000,
      bonusAmount: 0,
      pendingFromSales: 0,
      reservedForPayout: 0,
      totalAvailableDisplay: 5000,
    },
  })),
  appendWalletLedgerEntry: (...args: unknown[]) => appendLedger(...args),
}));

vi.mock("@/lib/finance/balance", () => ({
  reverseAvailableBalance: (...args: unknown[]) => reverseAvailable(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        userWallet: { update: walletUpdate },
      }),
  },
}));

describe("wallet product payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates ledger before debiting top-up bucket", async () => {
    appendLedger.mockResolvedValue(true);
    const { payInternalProduct } = await import("@/lib/lot-wallet/payment");
    const result = await payInternalProduct({
      userId: "u1",
      sellerProfileId: null,
      productType: "PRODUCT_ORDER",
      amount: 4590,
      referenceId: "ord_1",
      title: "Покупка · заказ 1",
      idempotencyKey: "order:wallet:ord_1",
    });
    expect(result.ok).toBe(true);
    expect(appendLedger.mock.invocationCallOrder[0]).toBeLessThan(
      walletUpdate.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(walletUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { topupSpendableAmount: { decrement: 4590 } },
      }),
    );
  });

  it("does not debit when duplicate idempotency key exists", async () => {
    appendLedger.mockResolvedValue(false);
    const { payInternalProduct } = await import("@/lib/lot-wallet/payment");
    const result = await payInternalProduct({
      userId: "u1",
      sellerProfileId: null,
      productType: "PRODUCT_ORDER",
      amount: 1000,
      referenceId: "ord_dup",
      title: "Покупка",
      idempotencyKey: "order:wallet:ord_dup",
    });
    expect(result.ok).toBe(true);
    expect(walletUpdate).not.toHaveBeenCalled();
    expect(reverseAvailable).not.toHaveBeenCalled();
  });
});
