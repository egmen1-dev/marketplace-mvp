import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  createFinancialEngineTxMock,
  mockPrismaFinancialTransaction,
} from "./helpers/financial-tx-mock";

const appendLedger = vi.fn();
const idempotencyKeys = new Set<string>();

vi.mock("@/lib/lot-wallet/flags", () => ({ isLotWalletEnabled: () => true }));

let walletTopup = 5000;

vi.mock("@/lib/lot-wallet/queries", () => ({
  getOrCreateUserWallet: vi.fn(async () => ({
    topupSpendableAmount: walletTopup,
    bonusSpendableAmount: 0,
  })),
  getWalletOverview: vi.fn(async () => ({
    enabled: true,
    buckets: {
      spendableAmount: walletTopup,
      withdrawableAmount: 0,
      topupAmount: walletTopup,
      bonusAmount: 0,
      pendingFromSales: 0,
      reservedForPayout: 0,
      totalAvailableDisplay: walletTopup,
    },
  })),
  hasWalletLedgerIdempotencyKey: vi.fn(async (key: string) =>
    idempotencyKeys.has(key),
  ),
  appendWalletLedgerEntry: (...args: unknown[]) => appendLedger(...args),
}));

vi.mock("@/lib/finance/balance", () => ({
  reverseAvailableBalance: vi.fn(),
}));

vi.mock("@/lib/financial-transaction-engine/verification", () => ({
  verifyWalletLedgerMatchesBalanceInTx: vi.fn(async () => {}),
  verifyWalletOrderPaidInTx: vi.fn(async () => {}),
  verifySellerBalanceNonNegativeInTx: vi.fn(async () => {}),
}));

describe("wallet concurrency guard", () => {
  let walletUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    walletTopup = 5000;
    idempotencyKeys.clear();

    const mock = createFinancialEngineTxMock({ topup: walletTopup });
    walletUpdate = mock.walletUpdate.mockImplementation(async (args: {
      data: { topupSpendableAmount: { decrement: number } };
    }) => {
      walletTopup -= args.data.topupSpendableAmount.decrement;
    });

    vi.doMock("@/lib/prisma", () => mockPrismaFinancialTransaction(mock.tx));
  });

  it("serializes duplicate idempotency attempts without double debit", async () => {
    appendLedger.mockImplementation(async (input: { idempotencyKey?: string }) => {
      if (input.idempotencyKey) {
        if (idempotencyKeys.has(input.idempotencyKey)) return false;
        idempotencyKeys.add(input.idempotencyKey);
      }
      return true;
    });

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

    const a = await payInternalProduct(input);
    const b = await payInternalProduct(input);

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(walletUpdate).toHaveBeenCalledTimes(1);
    expect(walletTopup).toBe(1000);
  });
});
