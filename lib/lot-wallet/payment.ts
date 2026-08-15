import type { WalletLedgerType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { reverseAvailableBalance } from "@/lib/finance/balance";

import {
  assertSpendableAmount,
  assertWithdrawableAmount,
  computeWalletBuckets,
  maxSpendableDebit,
} from "./buckets";
import { appendWalletLedgerEntry, getOrCreateUserWallet, getWalletOverview } from "./queries";
import { isLotWalletEnabled } from "./flags";

export type InternalProductType = "PROMOTION" | "SUBSCRIPTION" | "INTERNAL_SERVICE" | "PRODUCT_ORDER";

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

  const ledgerType: WalletLedgerType =
    input.productType === "PROMOTION"
      ? "PROMOTION_PURCHASE"
      : input.productType === "PRODUCT_ORDER"
        ? "PRODUCT_PURCHASE"
        : "INTERNAL_SERVICE_PURCHASE";

  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await getOrCreateUserWallet(input.userId, tx);
      let remaining = input.amount;
      const topup = Number(wallet.topupSpendableAmount);
      const bonus = Number(wallet.bonusSpendableAmount);
      const withdrawable = overview.buckets.withdrawableAmount;

      const fromTopup = Math.min(remaining, topup);
      remaining -= fromTopup;
      const fromBonus = Math.min(remaining, bonus);
      remaining -= fromBonus;
      const fromWithdrawable = Math.min(remaining, withdrawable);

      if (fromTopup + fromBonus + fromWithdrawable < input.amount) {
        throw new Error("Недостаточно средств в кошельке");
      }

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

      await appendWalletLedgerEntry(
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
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось списать средства",
    };
  }
}

export function walletSpendableForCheckout(input: {
  userId: string;
  sellerProfileId: string | null;
}): Promise<number> {
  return getWalletOverview(input).then((o) =>
    o.enabled ? maxSpendableDebit(o.buckets) : 0,
  );
}

export { assertWithdrawableAmount, computeWalletBuckets };
