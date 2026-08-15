/**
 * Production gate stress — mixed parallel financial operations.
 * Run: npm run finance:stress-gate
 */
import { describe, expect, it } from "vitest";

import { executeFinancialTransaction } from "@/lib/financial-transaction-engine";
import { verifyWalletLedgerMatchesBalanceInTx } from "@/lib/financial-transaction-engine/verification";
import { appendWalletLedgerEntry, getOrCreateUserWallet } from "@/lib/lot-wallet/queries";
import { prisma } from "@/lib/prisma";

const STRESS_OPS = Number(process.env.STRESS_OPS ?? "1000");
const PARALLEL_USERS = Number(process.env.STRESS_PARALLEL ?? "10");
const hasDb = Boolean(process.env.DATABASE_URL);
const runGate = process.env.FINANCIAL_STRESS_GATE === "1";

async function creditUser(userId: string, amount: number, key: string) {
  return executeFinancialTransaction(
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
            title: "Stress gate top-up",
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
      verify: async (tx) => verifyWalletLedgerMatchesBalanceInTx(tx, userId),
    },
  );
}

describe.skipIf(!hasDb || !runGate)("financial stress gate", () => {
  it(
    `runs ${STRESS_OPS} ops with ${PARALLEL_USERS} parallel user workers`,
    async () => {
      const base = Date.now();
      const started = Date.now();
      const opsPerUser = Math.ceil(STRESS_OPS / PARALLEL_USERS);

      let successes = 0;
      let duplicates = 0;
      let failures = 0;

      const workers = Array.from({ length: PARALLEL_USERS }, (_, worker) => worker);

      await Promise.all(
        workers.map(async (worker) => {
          const user = await prisma.user.create({
            data: {
              email: `stress-gate-${base}-w${worker}@demo.lot`,
              name: `Gate Worker ${worker}`,
              role: "BUYER",
              passwordHash: "stress-gate",
            },
          });

          try {
            for (let j = 0; j < opsPerUser; j += 1) {
              const globalIndex = worker * opsPerUser + j;
              if (globalIndex >= STRESS_OPS) break;

              const isDupReplay = j > 0 && j % 5 === 0;
              const key = `stress-gate:${base}:w${worker}:${j}`;
              const useKey = isDupReplay
                ? `stress-gate:${base}:w${worker}:${j - 1}`
                : key;
              const amount = 1 + (globalIndex % 37);

              const result = await creditUser(user.id, amount, useKey);
              if (result.ok) successes += 1;
              else failures += 1;
              if (result.duplicate) duplicates += 1;
            }

            await prisma.$transaction(async (tx) => {
              await verifyWalletLedgerMatchesBalanceInTx(tx, user.id);
            });
          } finally {
            await prisma.walletLedgerEntry.deleteMany({ where: { userId: user.id } });
            await prisma.userWallet.deleteMany({ where: { userId: user.id } });
            await prisma.user.delete({ where: { id: user.id } });
          }
        }),
      );

      expect(failures).toBe(0);
      expect(successes).toBeGreaterThanOrEqual(STRESS_OPS - Math.floor(STRESS_OPS / 5));
      expect(duplicates).toBeGreaterThan(0);

      console.log(
        JSON.stringify({
          totalOperations: STRESS_OPS,
          parallelUsers: PARALLEL_USERS,
          opsPerUser,
          successes,
          duplicates,
          unexpectedFailures: failures,
          runtimeMs: Date.now() - started,
        }),
      );
    },
    600_000,
  );
});
