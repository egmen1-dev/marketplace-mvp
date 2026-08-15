import { OrderStatus, PaymentStatus } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";

import type { Tx } from "./types";
import { FinancialVerificationError } from "./types";

function assertClose(a: number, b: number, label: string): void {
  if (Math.abs(a - b) > 0.01) {
    throw new FinancialVerificationError(`${label}: expected ${b}, got ${a}`);
  }
}

/** Wallet buckets must equal Σ ledger spendable deltas for a user. */
export async function verifyWalletLedgerMatchesBalanceInTx(
  tx: Tx,
  userId: string,
): Promise<void> {
  const wallet = await tx.userWallet.findUnique({ where: { userId } });
  const agg = await tx.walletLedgerEntry.aggregate({
    where: { userId },
    _sum: { spendableDelta: true, withdrawableDelta: true },
  });

  const topup = toPriceNumber(wallet?.topupSpendableAmount ?? 0);
  const bonus = toPriceNumber(wallet?.bonusSpendableAmount ?? 0);
  const ledgerSpendable = toPriceNumber(agg._sum.spendableDelta ?? 0);

  assertClose(topup + bonus, ledgerSpendable, "wallet spendable vs ledger");
}

/** Paid wallet order must have payment row + product ledger debit. */
export async function verifyWalletOrderPaidInTx(
  tx: Tx,
  input: { userId: string; orderId: string; amountRub: number },
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    include: { payment: true },
  });
  if (!order) {
    throw new FinancialVerificationError(`order ${input.orderId} missing after pay`);
  }
  if (order.status === OrderStatus.NEW) {
    throw new FinancialVerificationError(
      `order ${input.orderId} still NEW after wallet checkout`,
    );
  }
  if (order.payment?.status !== PaymentStatus.SUCCEEDED) {
    throw new FinancialVerificationError(
      `order ${input.orderId} payment not SUCCEEDED`,
    );
  }

  const ledger = await tx.walletLedgerEntry.findFirst({
    where: {
      userId: input.userId,
      type: "PRODUCT_PURCHASE",
      referenceId: input.orderId,
    },
  });
  if (!ledger) {
    throw new FinancialVerificationError(
      `missing PRODUCT_PURCHASE ledger for order ${input.orderId}`,
    );
  }

  assertClose(toPriceNumber(ledger.amount), input.amountRub, "ledger debit amount");
  await verifyWalletLedgerMatchesBalanceInTx(tx, input.userId);
}

/** Seller pending/available must not go negative after hold/release. */
export async function verifySellerBalanceNonNegativeInTx(
  tx: Tx,
  sellerId: string,
): Promise<void> {
  const row = await tx.sellerBalance.findUnique({ where: { sellerId } });
  if (!row) return;
  if (
    toPriceNumber(row.pendingAmount) < -0.01 ||
    toPriceNumber(row.availableAmount) < -0.01 ||
    toPriceNumber(row.reservedForPayoutAmount) < -0.01
  ) {
    throw new FinancialVerificationError(
      `seller ${sellerId} has negative balance bucket`,
    );
  }
}
