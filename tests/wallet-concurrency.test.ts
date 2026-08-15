import { describe, expect, it, vi, beforeEach } from "vitest";

const appendLedger = vi.fn();
const walletUpdate = vi.fn();

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
  reverseAvailableBalance: vi.fn(),
}));

let locked = false;

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<void>) => {
      if (locked) {
        await new Promise((r) => setTimeout(r, 50));
      }
      locked = true;
      try {
        await fn({ userWallet: { update: walletUpdate } });
      } finally {
        locked = false;
      }
    },
  },
}));

describe("wallet concurrency guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locked = false;
    let first = true;
    appendLedger.mockImplementation(async () => {
      if (first) {
        first = false;
        return true;
      }
      return false;
    });
  });

  it("serializes duplicate idempotency attempts without double debit", async () => {
    const { payInternalProduct } = await import("@/lib/lot-wallet/payment");
    const input = {
      userId: "u1",
      sellerProfileId: null,
      productType: "PRODUCT_ORDER" as const,
      amount: 4000,
      referenceId: "ord_c",
      title: "Покупка",
      idempotencyKey: "order:wallet:ord_c",
    };
    const [a, b] = await Promise.all([
      payInternalProduct(input),
      payInternalProduct(input),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(walletUpdate).toHaveBeenCalledTimes(1);
  });
});
