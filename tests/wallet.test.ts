import { describe, expect, it } from "vitest";

import {
  assertSpendableAmount,
  assertWithdrawableAmount,
  computeWalletBuckets,
} from "@/lib/lot-wallet/buckets";

describe("lot wallet buckets", () => {
  it("treats seller available as withdrawable and spendable", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: {
        sellerId: "s1",
        pendingAmount: 1000,
        availableAmount: 5000,
        paidAmount: 0,
        reservedForPayoutAmount: 500,
        updatedAt: new Date().toISOString(),
      },
      userWallet: { topupSpendableAmount: 2000, bonusSpendableAmount: 450 },
    });

    expect(buckets.withdrawableAmount).toBe(4500);
    expect(buckets.spendableAmount).toBe(6950);
    expect(buckets.pendingFromSales).toBe(1000);
    expect(buckets.topupAmount).toBe(2000);
    expect(buckets.bonusAmount).toBe(450);
  });

  it("blocks withdrawing more than seller earnings", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: null,
      userWallet: { topupSpendableAmount: 5000, bonusSpendableAmount: 0 },
    });
    expect(() => assertWithdrawableAmount(buckets, 100)).toThrow(
      /пополнения или бонусы/i,
    );
  });

  it("allows spending topup but not withdrawing it", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: null,
      userWallet: { topupSpendableAmount: 3000, bonusSpendableAmount: 0 },
    });
    expect(() => assertSpendableAmount(buckets, 2500)).not.toThrow();
    expect(() => assertWithdrawableAmount(buckets, 100)).toThrow();
  });
});
