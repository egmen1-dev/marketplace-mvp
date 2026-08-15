import type { WalletLedgerType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { executeFinancialTransaction } from "@/lib/financial-transaction-engine";
import { verifyWalletLedgerMatchesBalanceInTx } from "@/lib/financial-transaction-engine/verification";
import { reverseAvailableBalance } from "@/lib/finance/balance";

import {
  assertSpendableAmount,
  computeWalletBuckets,
  maxSpendableDebit,
} from "./buckets";
import { appendWalletLedgerEntry, getOrCreateUserWallet, getWalletOverview, hasWalletLedgerIdempotencyKey } from "./queries";
import { isLotWalletEnabled } from "./flags";

export type InternalProductType =
  | "PROMOTION"
  | "SUBSCRIPTION"
  | "INTERNAL_SERVICE"
  | "PRODUCT_ORDER";

type Tx = Prisma.TransactionClient;

type DebitBuckets = Awaited<ReturnType<typeof getWalletOverview>>["buckets"];

async function payInternalProductInTx(
  tx: Tx,
  input: {
    userId: string;
    sellerProfileId: string | null;
    productType: InternalProductType;
    amount: number;
    referenceId: string;
    title: string;
    idempotencyKey: string;
    buckets: DebitBuckets;
  },
): Promise<{ duplicate: boolean }> {
  const ledgerType: WalletLedgerType =
    input.productType === "PROMOTION"
      ? "PROMOTION_PURCHASE"
      : input.productType === "PRODUCT_ORDER"
        ? "PRODUCT_PURCHASE"
        : "INTERNAL_SERVICE_PURCHASE";

  const wallet = await getOrCreateUserWallet(input.userId, tx);
  let remaining = input.amount;
  const topup = Number(wallet.topupSpendableAmount);
  const bonus = Number(wallet.bonusSpendableAmount);
  const withdrawable = input.buckets.withdrawableAmount;

  const fromTopup = Math.min(remaining, topup);
  remaining -= fromTopup;
  const fromBonus = Math.min(remaining, bonus);
  remaining -= fromBonus;
  const fromWithdrawable = Math.min(remaining, withdrawable);

  if (fromTopup + fromBonus + fromWithdrawable < input.amount) {
    throw new Error("Недостаточно средств в кошельке");
  }

  const created = await appendWalletLedgerEntry(
    {
      userId: input.userId,
      type: ledgerType,
      direction: "DEBIT",
      amount: input.amount,
      spendableDelta: -input.amount,
      withdrawableDelta: -fromWithdrawable,
      title: input.title,
      referenceType: input.productType,
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
    },
    tx,
  );
  if (!created) return { duplicate: true };

  if (fromTopup > 0) {
    await tx.userWallet.update({
      where: { userId: input.userId },
      data: { topupSpendableAmount: { decrement: fromTopup } },
    });
  }
  if (fromBonus > 0) {
    await tx.userWallet.update({
      where: { userId: input.userId },
      data: { bonusSpendableAmount: { decrement: fromBonus } },
    });
  }
  if (fromWithdrawable > 0 && input.sellerProfileId) {
    await reverseAvailableBalance(input.sellerProfileId, fromWithdrawable, tx);
  }

  return { duplicate: false };
}

export async function payInternalProduct(input: {
  userId: string;
  sellerProfileId: string | null;
  productType: InternalProductType;
  amount: number;
  referenceId: string;
  title: string;
  idempotencyKey: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLotWalletEnabled()) {
    return { ok: false, error: "Кошелёк ЛОТ временно недоступен" };
  }

  if (await hasWalletLedgerIdempotencyKey(input.idempotencyKey)) {
    return { ok: true };
  }

  const overview = await getWalletOverview({
    userId: input.userId,
    sellerProfileId: input.sellerProfileId,
  });

  try {
    assertSpendableAmount(overview.buckets, input.amount);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Недостаточно средств",
    };
  }

  const operationType =
    input.productType === "PROMOTION" ? "PROMOTION_PAYMENT" : "WALLET_CHECKOUT";

  const result = await executeFinancialTransaction(
    {
      operationType,
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
      sellerId: input.sellerProfileId ?? undefined,
      referenceType: input.productType,
      referenceId: input.referenceId,
      amountRub: input.amount,
    },
    {
      lock: async (tx) => {
        await tx.userWallet.findUnique({ where: { userId: input.userId } });
      },
      execute: async (tx) =>
        payInternalProductInTx(tx, { ...input, buckets: overview.buckets }),
      verify: async (tx) => {
        await verifyWalletLedgerMatchesBalanceInTx(tx, input.userId);
      },
    },
  );

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

/** Atomic debit + caller finalize (e.g. order payment) in one engine transaction. */
export async function payInternalProductWithFinalize(input: {
  userId: string;
  sellerProfileId: string | null;
  productType: InternalProductType;
  amount: number;
  referenceId: string;
  title: string;
  idempotencyKey: string;
  orderId?: string;
  finalize: (tx: Tx) => Promise<void>;
  verifyAfter?: (tx: Tx) => Promise<void>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLotWalletEnabled()) {
    return { ok: false, error: "Кошелёк ЛОТ временно недоступен" };
  }

  if (await hasWalletLedgerIdempotencyKey(input.idempotencyKey)) {
    return { ok: true };
  }

  const overview = await getWalletOverview({
    userId: input.userId,
    sellerProfileId: input.sellerProfileId,
  });

  try {
    assertSpendableAmount(overview.buckets, input.amount);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Недостаточно средств",
    };
  }

  const result = await executeFinancialTransaction(
    {
      operationType: "WALLET_CHECKOUT",
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
      sellerId: input.sellerProfileId ?? undefined,
      orderId: input.orderId,
      referenceType: input.productType,
      referenceId: input.referenceId,
      amountRub: input.amount,
    },
    {
      lock: async (tx) => {
        await tx.userWallet.findUnique({ where: { userId: input.userId } });
        if (input.orderId) {
          await tx.order.findUnique({ where: { id: input.orderId } });
        }
      },
      execute: async (tx) => {
        await payInternalProductInTx(tx, {
          userId: input.userId,
          sellerProfileId: input.sellerProfileId,
          productType: input.productType,
          amount: input.amount,
          referenceId: input.referenceId,
          title: input.title,
          idempotencyKey: input.idempotencyKey,
          buckets: overview.buckets,
        });
        await input.finalize(tx);
        return { ok: true as const };
      },
      verify: async (tx) => {
        await verifyWalletLedgerMatchesBalanceInTx(tx, input.userId);
        if (input.verifyAfter) await input.verifyAfter(tx);
      },
    },
  );

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export function walletSpendableForCheckout(input: {
  userId: string;
  sellerProfileId: string | null;
}): Promise<number> {
  return getWalletOverview(input).then((o) =>
    o.enabled ? maxSpendableDebit(o.buckets) : 0,
  );
}

export { assertWithdrawableAmount, computeWalletBuckets } from "./buckets";
