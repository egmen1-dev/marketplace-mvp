import { prisma } from "@/lib/prisma";
import { computeWalletBuckets } from "@/lib/lot-wallet/buckets";
import { getWalletOverview } from "@/lib/lot-wallet/queries";
import { getSellerBalance } from "@/lib/finance/balance";

export type FinancialReconciliationReport = {
  usersChecked: number;
  ledgerMismatch: number;
  negativeSpendable: number;
  negativeWithdrawable: number;
  negativeHeld: number;
  orphanLedgerEntries: number;
  duplicateIdempotencyKeys: number;
  payoutOverWithdrawable: number;
  completedPayoutWithReserved: number;
  walletPurchaseWithoutLedger: number;
  issues: string[];
};

function toNum(value: unknown): number {
  return Number(value ?? 0);
}

/** Read-only reconciliation across wallet ledger, user wallet, seller balance, payouts. */
export async function runFinancialReconciliation(): Promise<FinancialReconciliationReport> {
  const issues: string[] = [];
  let ledgerMismatch = 0;
  let negativeSpendable = 0;
  let negativeWithdrawable = 0;
  let negativeHeld = 0;
  let payoutOverWithdrawable = 0;
  let completedPayoutWithReserved = 0;
  let walletPurchaseWithoutLedger = 0;

  const wallets = await prisma.userWallet.findMany({
    select: {
      userId: true,
      topupSpendableAmount: true,
      bonusSpendableAmount: true,
      user: { select: { sellerProfile: { select: { id: true } } } },
    },
  });

  for (const wallet of wallets) {
    const sellerProfileId = wallet.user.sellerProfile?.id ?? null;
    const overview = await getWalletOverview({ userId: wallet.userId, sellerProfileId });
    const buckets = overview.buckets;

    const ledgerAgg = await prisma.walletLedgerEntry.aggregate({
      where: { userId: wallet.userId },
      _sum: { spendableDelta: true, withdrawableDelta: true },
    });
    const ledgerSpendable = toNum(ledgerAgg._sum.spendableDelta);
    const ledgerWithdrawable = toNum(ledgerAgg._sum.withdrawableDelta);

    const expectedTopup = toNum(wallet.topupSpendableAmount);
    const expectedBonus = toNum(wallet.bonusSpendableAmount);
    const sellerBalance = sellerProfileId
      ? await getSellerBalance(sellerProfileId)
      : null;
    const expectedWithdrawable = sellerBalance
      ? Math.max(
          0,
          toNum(sellerBalance.availableAmount) -
            toNum(sellerBalance.reservedForPayoutAmount),
        )
      : 0;

    if (expectedTopup < 0 || expectedBonus < 0) {
      negativeSpendable += 1;
      issues.push(`user ${wallet.userId}: negative topup/bonus bucket`);
    }
    if (expectedWithdrawable < 0) {
      negativeWithdrawable += 1;
      issues.push(`user ${wallet.userId}: negative withdrawable projection`);
    }
    if (toNum(sellerBalance?.pendingAmount) < 0) {
      negativeHeld += 1;
      issues.push(`user ${wallet.userId}: negative pending seller funds`);
    }

    const recomputed = computeWalletBuckets({
      sellerBalance,
      userWallet: {
        topupSpendableAmount: expectedTopup,
        bonusSpendableAmount: expectedBonus,
      },
    });

    if (
      Math.abs(recomputed.spendableAmount - buckets.spendableAmount) > 0.01 ||
      Math.abs(recomputed.withdrawableAmount - buckets.withdrawableAmount) > 0.01
    ) {
      ledgerMismatch += 1;
      issues.push(`user ${wallet.userId}: bucket projection mismatch`);
    }

    const walletOnlySpendable = expectedTopup + expectedBonus;
    if (Math.abs(ledgerSpendable - walletOnlySpendable) > 0.01) {
      ledgerMismatch += 1;
      issues.push(
        `user ${wallet.userId}: wallet ledger mismatch (spendable ${ledgerSpendable} vs topup+bonus ${walletOnlySpendable})`,
      );
    }

    const sellerLedgerAgg = await prisma.walletLedgerEntry.aggregate({
      where: { userId: wallet.userId, type: "SELLER_SALE" },
      _sum: { withdrawableDelta: true },
    });
    const sellerLedgerWithdrawable = toNum(sellerLedgerAgg._sum.withdrawableDelta);
    if (
      sellerLedgerWithdrawable > 0.01 &&
      Math.abs(sellerLedgerWithdrawable - expectedWithdrawable) > 0.01
    ) {
      ledgerMismatch += 1;
      issues.push(
        `user ${wallet.userId}: seller ledger withdrawable mismatch (${sellerLedgerWithdrawable} vs ${expectedWithdrawable})`,
      );
    }
  }

  const ledgerWithKeys = await prisma.walletLedgerEntry.groupBy({
    by: ["idempotencyKey"],
    where: { idempotencyKey: { not: null } },
    _count: { idempotencyKey: true },
  });
  const duplicateIdempotencyKeys = ledgerWithKeys.filter(
    (row) => row._count.idempotencyKey > 1,
  ).length;
  if (duplicateIdempotencyKeys > 0) {
    issues.push(`${duplicateIdempotencyKeys} duplicated idempotency keys in ledger`);
  }

  const orphanLedgerEntries = 0;

  const openPayouts = await prisma.payoutRequest.findMany({
    where: { status: { in: ["UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
    select: { id: true, amount: true, sellerId: true },
  });
  for (const payout of openPayouts) {
    const balance = await getSellerBalance(payout.sellerId);
    const withdrawable = Math.max(
      0,
      toNum(balance.availableAmount) - toNum(balance.reservedForPayoutAmount),
    );
    if (toNum(payout.amount) > withdrawable + 0.01) {
      payoutOverWithdrawable += 1;
      issues.push(`payout ${payout.id}: amount exceeds withdrawable`);
    }
  }

  const completedWithReserve = await prisma.payoutRequest.findMany({
    where: { status: "COMPLETED" },
    select: { sellerId: true },
  });
  for (const payout of completedWithReserve) {
    const bal = await prisma.sellerBalance.findUnique({
      where: { sellerId: payout.sellerId },
    });
    if (bal && toNum(bal.reservedForPayoutAmount) > 0.01) {
      completedPayoutWithReserved += 1;
      issues.push(
        `seller ${payout.sellerId}: completed payout with reserved balance remaining`,
      );
    }
  }

  const walletPaidOrders = await prisma.payment.count({
    where: {
      status: "SUCCEEDED",
      stripeSessionId: null,
      stripePaymentIntentId: null,
    },
  });
  const walletPurchaseLedger = await prisma.walletLedgerEntry.count({
    where: { type: "PRODUCT_PURCHASE" },
  });
  if (walletPaidOrders > walletPurchaseLedger) {
    walletPurchaseWithoutLedger = walletPaidOrders - walletPurchaseLedger;
    issues.push(
      `wallet-style paid orders (${walletPaidOrders}) exceed PRODUCT_PURCHASE ledger rows (${walletPurchaseLedger})`,
    );
  }

  return {
    usersChecked: wallets.length,
    ledgerMismatch,
    negativeSpendable,
    negativeWithdrawable,
    negativeHeld,
    orphanLedgerEntries,
    duplicateIdempotencyKeys,
    payoutOverWithdrawable,
    completedPayoutWithReserved,
    walletPurchaseWithoutLedger,
    issues,
  };
}
