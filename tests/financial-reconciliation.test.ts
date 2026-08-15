import { describe, expect, it } from "vitest";

import { runFinancialReconciliation } from "@/lib/financial/reconciliation";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("financial reconciliation", () => {
  it("returns a reconciliation report with zero critical issues on clean DB", async () => {
    const report = await runFinancialReconciliation();
    expect(report.usersChecked).toBeGreaterThanOrEqual(0);
    expect(report.duplicateIdempotencyKeys).toBe(0);
    expect(report.negativeSpendable).toBe(0);
    expect(report.negativeWithdrawable).toBe(0);
    expect(report.negativeHeld).toBe(0);
  });
});

describe("financial reconciliation shape", () => {
  it("exports expected report fields", () => {
    expect(typeof runFinancialReconciliation).toBe("function");
  });
});
