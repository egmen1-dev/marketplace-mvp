import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFinancialEngineTxMock,
  mockPrismaFinancialTransaction,
} from "./helpers/financial-tx-mock";

const appendLedger = vi.fn();

vi.mock("@/lib/financial-transaction-engine/verification", () => ({
  verifyWalletLedgerMatchesBalanceInTx: vi.fn(async () => {}),
  verifyWalletOrderPaidInTx: vi.fn(async () => {}),
  verifySellerBalanceNonNegativeInTx: vi.fn(async () => {}),
}));

vi.mock("@/lib/lot-wallet/queries", () => ({
  getOrCreateUserWallet: vi.fn(async () => ({})),
  appendWalletLedgerEntry: (...args: unknown[]) => appendLedger(...args),
  hasWalletLedgerIdempotencyKey: vi.fn(async () => false),
}));

describe("wallet top-up idempotency", () => {
  let walletUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    const mock = createFinancialEngineTxMock();
    walletUpdate = mock.walletUpdate;
    vi.doMock("@/lib/prisma", () => mockPrismaFinancialTransaction(mock.tx));
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
