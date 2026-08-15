import { describe, expect, it } from "vitest";

import { assertWithdrawableAmount, computeWalletBuckets } from "@/lib/lot-wallet/buckets";
import { validatePayoutAmount } from "@/lib/seller-payout/requests";

describe("payout wallet security", () => {
  it("blocks payout above withdrawable seller balance", () => {
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
    expect(validatePayoutAmount({ amount: 22_000, availableAmount: 20_000 })).toContain(
      "превышает",
    );
  });

  it("blocks withdrawing top-up-only balance", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: null,
      userWallet: { topupSpendableAmount: 10_000, bonusSpendableAmount: 0 },
    });
    expect(() => assertWithdrawableAmount(buckets, 10_000)).toThrow();
  });

  it("blocks withdrawing bonus-only balance", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: null,
      userWallet: { topupSpendableAmount: 0, bonusSpendableAmount: 3_000 },
    });
    expect(() => assertWithdrawableAmount(buckets, 3_000)).toThrow();
  });

  it("respects reserved payout amount in withdrawable projection", () => {
    const buckets = computeWalletBuckets({
      sellerBalance: {
        pendingAmount: 0,
        availableAmount: 20_000,
        reservedForPayoutAmount: 10_000,
        paidAmount: 0,
      },
      userWallet: { topupSpendableAmount: 0, bonusSpendableAmount: 0 },
    });
    expect(buckets.withdrawableAmount).toBe(10_000);
    expect(validatePayoutAmount({ amount: 15_000, availableAmount: 10_000 })).toContain(
      "превышает",
    );
  });
});
