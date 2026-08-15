import { vi } from "vitest";

/** Minimal tx client for financial engine unit tests (lock + verify). */
export function createFinancialEngineTxMock(input?: {
  topup?: number;
  bonus?: number;
  ledgerSpendable?: number;
}) {
  const topup = input?.topup ?? 5000;
  const bonus = input?.bonus ?? 0;
  const ledgerSpendable = input?.ledgerSpendable ?? topup + bonus;
  const walletUpdate = vi.fn();

  const tx = {
    userWallet: {
      findUnique: vi.fn(async () => ({
        topupSpendableAmount: topup,
        bonusSpendableAmount: bonus,
      })),
      update: walletUpdate,
    },
    walletLedgerEntry: {
      aggregate: vi.fn(async () => ({
        _sum: {
          spendableDelta: ledgerSpendable,
          withdrawableDelta: 0,
        },
      })),
    },
    sellerBalance: {
      findUnique: vi.fn(async () => ({
        pendingAmount: 0,
        availableAmount: 10000,
        reservedForPayoutAmount: 0,
      })),
    },
    financeTransaction: {
      findUnique: vi.fn(async () => null),
    },
    order: {
      findUnique: vi.fn(async () => null),
    },
  };

  return { tx, walletUpdate };
}

export function mockPrismaFinancialTransaction(tx: object) {
  return {
    prisma: {
      $transaction: async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx),
      financialAuditLog: {
        create: vi.fn(async () => ({ id: "audit_1" })),
      },
      financialIncident: {
        create: vi.fn(async () => ({ id: "inc_1" })),
      },
    },
  };
}
