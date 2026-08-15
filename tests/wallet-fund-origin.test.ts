import { describe, expect, it } from "vitest";

import { assertWithdrawableAmount, computeWalletBuckets } from "@/lib/lot-wallet/buckets";

describe("wallet fund origin rules", () => {
  it("top-up funds are spendable but not withdrawable", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: null,
      userWallet: { topupSpendableAmount: 10_000, bonusSpendableAmount: 0 },
    });
    expect(buckets.spendableAmount).toBe(10_000);
    expect(buckets.withdrawableAmount).toBe(0);
    expect(() => assertWithdrawableAmount(buckets, 10_000)).toThrow(/пополнения|бонусы/i);
  });

  it("bonus funds are spendable but not withdrawable", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: null,
      userWallet: { topupSpendableAmount: 0, bonusSpendableAmount: 2500 },
    });
    expect(buckets.spendableAmount).toBe(2500);
    expect(buckets.withdrawableAmount).toBe(0);
    expect(() => assertWithdrawableAmount(buckets, 2500)).toThrow(/пополнения|бонусы/i);
  });

  it("seller released proceeds are spendable and withdrawable", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: {
        pendingAmount: 0,
        availableAmount: 20_000,
        reservedForPayoutAmount: 0,
        paidAmount: 0,
      },
      userWallet: { topupSpendableAmount: 0, bonusSpendableAmount: 0 },
    });
    expect(buckets.spendableAmount).toBe(20_000);
    expect(buckets.withdrawableAmount).toBe(20_000);
    expect(() => assertWithdrawableAmount(buckets, 20_000)).not.toThrow();
  });

  it("held pending seller funds are not spendable", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: {
        pendingAmount: 15_000,
        availableAmount: 0,
        reservedForPayoutAmount: 0,
        paidAmount: 0,
      },
      userWallet: { topupSpendableAmount: 0, bonusSpendableAmount: 0 },
    });
    expect(buckets.pendingFromSales).toBe(15_000);
    expect(buckets.spendableAmount).toBe(0);
    expect(buckets.withdrawableAmount).toBe(0);
  });

  it("mixed top-up + seller proceeds keeps withdrawable limited to seller portion", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: {
        pendingAmount: 0,
        availableAmount: 20_000,
        reservedForPayoutAmount: 0,
        paidAmount: 0,
      },
      userWallet: { topupSpendableAmount: 5_000, bonusSpendableAmount: 0 },
    });
    expect(buckets.spendableAmount).toBe(25_000);
    expect(buckets.withdrawableAmount).toBe(20_000);
    expect(() => assertWithdrawableAmount(buckets, 22_000)).toThrow();
  });
});
