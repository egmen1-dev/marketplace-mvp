import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  createFinancialEngineTxMock,
  mockPrismaFinancialTransaction,
} from "./helpers/financial-tx-mock";

vi.mock("@/lib/lot-wallet/flags", () => ({ isLotWalletEnabled: () => true }));

const appendLedger = vi.fn();
let mockSpendable = 5000;

vi.mock("@/lib/financial-transaction-engine/verification", () => ({
  verifyWalletLedgerMatchesBalanceInTx: vi.fn(async () => {}),
  verifyWalletOrderPaidInTx: vi.fn(async () => {}),
  verifySellerBalanceNonNegativeInTx: vi.fn(async () => {}),
}));

vi.mock("@/lib/lot-wallet/queries", () => ({
  getOrCreateUserWallet: vi.fn(async () => ({
    topupSpendableAmount: mockSpendable,
    bonusSpendableAmount: 0,
  })),
  getWalletOverview: vi.fn(async () => ({
    enabled: true,
    buckets: {
      spendableAmount: mockSpendable,
      withdrawableAmount: 0,
      topupAmount: mockSpendable,
      bonusAmount: 0,
      pendingFromSales: 0,
      reservedForPayout: 0,
      totalAvailableDisplay: mockSpendable,
    },
  })),
  appendWalletLedgerEntry: (...args: unknown[]) => appendLedger(...args),
  hasWalletLedgerIdempotencyKey: vi.fn(async () => false),
}));

vi.mock("@/lib/finance/balance", () => ({
  reverseAvailableBalance: vi.fn(),
}));

describe("promotion wallet payment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSpendable = 5000;
    const mock = createFinancialEngineTxMock({ topup: mockSpendable });
    vi.doMock("@/lib/prisma", () => mockPrismaFinancialTransaction(mock.tx));
  });

  it("debits wallet with PROMOTION_PURCHASE ledger type", async () => {
    appendLedger.mockResolvedValue(true);
    const { payInternalProduct } = await import("@/lib/lot-wallet/payment");
    const result = await payInternalProduct({
      userId: "seller_u1",
      sellerProfileId: "sp1",
      productType: "PROMOTION",
      amount: 1790,
      referenceId: "prod1:GROWTH",
      title: "Продвижение · Рост · 14 дн.",
      idempotencyKey: "promo:sp1:prod1:GROWTH",
    });
    expect(result.ok).toBe(true);
    expect(appendLedger).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PROMOTION_PURCHASE" }),
      expect.anything(),
    );
  });

  it("returns insufficient funds error without partial debit", async () => {
    mockSpendable = 900;
    const mock = createFinancialEngineTxMock({ topup: 900 });
    vi.doMock("@/lib/prisma", () => mockPrismaFinancialTransaction(mock.tx));
    const { payInternalProduct } = await import("@/lib/lot-wallet/payment");
    const result = await payInternalProduct({
      userId: "seller_u1",
      sellerProfileId: "sp1",
      productType: "PROMOTION",
      amount: 1790,
      referenceId: "prod1:GROWTH",
      title: "Продвижение",
      idempotencyKey: "promo:sp1:prod1:GROWTH:2",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Недостаточно/i);
    expect(appendLedger).not.toHaveBeenCalled();
  });
});
