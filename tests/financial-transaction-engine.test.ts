import { describe, expect, it, vi, beforeEach } from "vitest";

const transaction = vi.fn();
const auditCreate = vi.fn();
const incidentCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
    financialAuditLog: { create: auditCreate },
    financialIncident: { create: incidentCreate },
  },
}));

describe("financial-transaction-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditCreate.mockResolvedValue({ id: "audit_1" });
    incidentCreate.mockResolvedValue({ id: "inc_1" });
  });

  it("runs validate → lock → execute → verify in one transaction", async () => {
    const phases: string[] = [];
    transaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) => {
      phases.push("tx_start");
      const result = await fn({});
      phases.push("tx_end");
      return result;
    });

    const { executeFinancialTransaction } = await import(
      "@/lib/financial-transaction-engine/execute"
    );

    const result = await executeFinancialTransaction(
      {
        operationType: "WALLET_TOP_UP",
        idempotencyKey: "test:topup:1",
        userId: "user_1",
        amountRub: 1000,
      },
      {
        validate: async () => {
          phases.push("validate");
        },
        lock: async () => {
          phases.push("lock");
        },
        execute: async () => {
          phases.push("execute");
          return { credited: true };
        },
        verify: async () => {
          phases.push("verify");
        },
      },
    );

    expect(result.ok).toBe(true);
    expect(phases).toEqual([
      "validate",
      "tx_start",
      "lock",
      "execute",
      "verify",
      "tx_end",
    ]);
    expect(auditCreate).toHaveBeenCalled();
  });

  it("creates CRITICAL incident on verification failure", async () => {
    transaction.mockImplementation(async (fn: (tx: object) => Promise<unknown>) =>
      fn({}),
    );

    const { executeFinancialTransaction } = await import(
      "@/lib/financial-transaction-engine/execute"
    );
    const { FinancialVerificationError } = await import(
      "@/lib/financial-transaction-engine/types"
    );

    const result = await executeFinancialTransaction(
      {
        operationType: "WALLET_CHECKOUT",
        idempotencyKey: "test:checkout:1",
        userId: "user_1",
        orderId: "ord_1",
      },
      {
        execute: async () => ({ ok: true }),
        verify: async () => {
          throw new FinancialVerificationError("order still NEW");
        },
      },
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("VERIFICATION_FAILED");
    expect(result.incidentId).toBe("inc_1");
    expect(incidentCreate).toHaveBeenCalled();
  });
});
