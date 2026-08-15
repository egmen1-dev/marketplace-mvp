import type { SellerBalanceDto } from "@/lib/finance/types";

import type { WalletBuckets } from "./types";

type UserWalletRow = {
  topupSpendableAmount: number;
  bonusSpendableAmount: number;
};

/** Spendable vs withdrawable bucket rules (Part 13). */
export function computeWalletBuckets(input: {
  sellerBalance: SellerBalanceDto | null;
  userWallet: UserWalletRow | null;
}): WalletBuckets {
  const pendingFromSales = input.sellerBalance?.pendingAmount ?? 0;
  const available = input.sellerBalance?.availableAmount ?? 0;
  const reservedForPayout = input.sellerBalance?.reservedForPayoutAmount ?? 0;
  const withdrawableAmount = Math.max(0, available - reservedForPayout);
  const topupAmount = input.userWallet?.topupSpendableAmount ?? 0;
  const bonusAmount = input.userWallet?.bonusSpendableAmount ?? 0;
  const spendableAmount = withdrawableAmount + topupAmount + bonusAmount;

  return {
    spendableAmount,
    withdrawableAmount,
    pendingFromSales,
    topupAmount,
    bonusAmount,
    reservedForPayout,
    totalAvailableDisplay: spendableAmount,
  };
}

/** Returns max amount that can be debited for internal purchase (spendable, not pending). */
export function maxSpendableDebit(buckets: WalletBuckets): number {
  return Math.max(0, buckets.spendableAmount);
}

/** Returns max amount eligible for payout request. */
export function maxWithdrawable(buckets: WalletBuckets): number {
  return Math.max(0, buckets.withdrawableAmount);
}

/** Top-up credits are spendable but never withdrawable. */
export function assertWithdrawableAmount(
  buckets: WalletBuckets,
  amount: number,
): void {
  if (amount <= 0) throw new Error("Сумма должна быть больше нуля");
  if (amount > buckets.withdrawableAmount) {
    throw new Error("Нельзя вывести пополнения или бонусы — только доход от продаж");
  }
}

export function assertSpendableAmount(
  buckets: WalletBuckets,
  amount: number,
): void {
  if (amount <= 0) throw new Error("Сумма должна быть больше нуля");
  if (amount > buckets.spendableAmount) {
    throw new Error("Недостаточно средств в кошельке");
  }
}
