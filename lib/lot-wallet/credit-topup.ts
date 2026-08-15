import type Stripe from "stripe";

import { toPriceNumber } from "@/features/products/mappers";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { appendWalletLedgerEntry, getOrCreateUserWallet } from "./queries";

export async function creditWalletTopUpFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ ok: true; userId: string; amount: number } | { ok: false; reason: string }> {
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

  await prisma.$transaction(async (tx) => {
    await getOrCreateUserWallet(userId, tx);
    await appendWalletLedgerEntry(
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
    await tx.userWallet.update({
      where: { userId },
      data: { topupSpendableAmount: { increment: amountRub } },
    });
  });

  log.info("wallet_topup_credited", { userId, amountRub, sessionId: session.id });
  return { ok: true, userId, amount: amountRub };
}
