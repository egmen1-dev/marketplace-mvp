/**
 * Financial stress test — isolated users, serial batches to avoid wallet lock races.
 * Production gate: STRESS_OPS=1000 for full scale run.
 */
import { describe, expect, it } from "vitest";

import { executeFinancialTransaction } from "@/lib/financial-transaction-engine";
import { verifyWalletLedgerMatchesBalanceInTx } from "@/lib/financial-transaction-engine/verification";
import { appendWalletLedgerEntry, getOrCreateUserWallet } from "@/lib/lot-wallet/queries";
import { prisma } from "@/lib/prisma";

const STRESS_OPS = Number(process.env.STRESS_OPS ?? "20");
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("financial stress test", () => {
  it(`runs ${STRESS_OPS} wallet ops with zero drift on isolated users`, async () => {
    const base = Date.now();
    const userIds: string[] = [];

    for (let i = 0; i < STRESS_OPS; i += 1) {
      const user = await prisma.user.create({
        data: {
          email: `stress-${base}-${i}@demo.lot`,
          name: `Stress Buyer ${i}`,
          role: "BUYER",
          passwordHash: "stress-test",
        },
      });
      userIds.push(user.id);
    }

    try {
      for (let i = 0; i < STRESS_OPS; i += 1) {
        const userId = userIds[i]!;
        const amount = 1 + (i % 50);
        const key = `stress:${base}:${i}`;

        const result = await executeFinancialTransaction(
          {
            operationType: "WALLET_TOP_UP",
            idempotencyKey: key,
            userId,
            amountRub: amount,
          },
          {
            execute: async (tx) => {
              await getOrCreateUserWallet(userId, tx);
              const created = await appendWalletLedgerEntry(
                {
                  userId,
                  type: "BUYER_TOP_UP",
                  direction: "CREDIT",
                  amount,
                  spendableDelta: amount,
                  withdrawableDelta: 0,
                  title: "Stress top-up",
                  idempotencyKey: key,
                },
                tx,
              );
              if (created) {
                await tx.userWallet.update({
                  where: { userId },
                  data: { topupSpendableAmount: { increment: amount } },
                });
              }
              return { duplicate: !created };
            },
            verify: async (tx) => {
              await verifyWalletLedgerMatchesBalanceInTx(tx, userId);
            },
          },
        );
        expect(result.ok).toBe(true);
      }

      for (const userId of userIds) {
        await prisma.$transaction(async (tx) => {
          await verifyWalletLedgerMatchesBalanceInTx(tx, userId);
        });
      }
    } finally {
      await prisma.walletLedgerEntry.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.userWallet.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }, 120_000);
});
