import type Stripe from "stripe";

import { executeFinancialTransaction } from "@/lib/financial-transaction-engine";
import { verifyWalletLedgerMatchesBalanceInTx } from "@/lib/financial-transaction-engine/verification";
import { toPriceNumber } from "@/features/products/mappers";
import { log } from "@/lib/logger";

import { appendWalletLedgerEntry, getOrCreateUserWallet } from "./queries";

export async function creditWalletTopUpFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<
  | { ok: true; userId: string; amount: number; duplicate?: boolean }
  | { ok: false; reason: string }
> {
  if (session.metadata?.purpose !== "wallet_top_up") {
    return { ok: false, reason: "not_wallet_top_up" };
  }

  const userId = session.metadata.userId;
  if (!userId) {
    return { ok: false, reason: "missing_user_id" };
  }

  const amountTotal = session.amount_total;
  if (amountTotal == null) {
    return { ok: false, reason: "missing_amount" };
  }

  const amountRub = toPriceNumber(amountTotal / 100);
  const idempotencyKey = `topup:session:${session.id}`;

  const engine = await executeFinancialTransaction(
    {
      operationType: "WALLET_TOP_UP",
      idempotencyKey,
      userId,
      referenceType: "STRIPE_CHECKOUT",
      referenceId: session.id,
      amountRub,
      metadata: { sessionId: session.id },
    },
    {
      validate: () => {
        if (amountRub <= 0) throw new Error("invalid_topup_amount");
      },
      lock: async (tx) => {
        await tx.userWallet.findUnique({ where: { userId } });
      },
      execute: async (tx) => {
        await getOrCreateUserWallet(userId, tx);
        const created = await appendWalletLedgerEntry(
          {
            userId,
            type: "BUYER_TOP_UP",
            direction: "CREDIT",
            amount: amountRub,
            spendableDelta: amountRub,
            withdrawableDelta: 0,
            title: "Пополнение кошелька",
            subtitle: "Банковская карта",
            referenceType: "STRIPE_CHECKOUT",
            referenceId: session.id,
            idempotencyKey,
          },
          tx,
        );
        if (created) {
          await tx.userWallet.update({
            where: { userId },
            data: { topupSpendableAmount: { increment: amountRub } },
          });
        }
        return { duplicate: !created };
      },
      verify: async (tx) => {
        await verifyWalletLedgerMatchesBalanceInTx(tx, userId);
      },
    },
  );

  if (!engine.ok) {
    return { ok: false, reason: engine.error };
  }

  log.info("wallet_topup_credited", {
    userId,
    amountRub,
    sessionId: session.id,
    duplicate: engine.duplicate,
  });

  return {
    ok: true,
    userId,
    amount: amountRub,
    duplicate: engine.duplicate,
  };
}
