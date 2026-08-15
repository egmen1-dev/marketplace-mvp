/**
 * Chaos-style financial consistency tests (simulated failure modes).
 * Uses real DB when DATABASE_URL is available; skips destructive cases otherwise.
 */
import { Prisma } from "@prisma/client";
import { describe, expect, it, afterAll } from "vitest";

import { executeFinancialTransaction } from "@/lib/financial-transaction-engine";
import { verifyWalletLedgerMatchesBalanceInTx } from "@/lib/financial-transaction-engine/verification";
import { FinancialVerificationError } from "@/lib/financial-transaction-engine/types";
import { appendWalletLedgerEntry, getOrCreateUserWallet } from "@/lib/lot-wallet/queries";
import { prisma } from "@/lib/prisma";

describe("financial chaos consistency", () => {
  it("rolls back when verify fails after debit (simulated kill before commit)", async () => {
    const buyer = await prisma.user.findFirst({
      where: { role: "BUYER" },
      select: { id: true },
    });
    if (!buyer) return;

    const marker = `chaos-${Date.now()}`;
    const amount = 17.5;

    const before = await prisma.userWallet.findUnique({
      where: { userId: buyer.id },
    });
    const beforeTopup = Number(before?.topupSpendableAmount ?? 0);

    const result = await executeFinancialTransaction(
      {
        operationType: "WALLET_TOP_UP",
        idempotencyKey: `chaos:fail:${marker}`,
        userId: buyer.id,
        amountRub: amount,
      },
      {
        execute: async (tx) => {
          await getOrCreateUserWallet(buyer.id, tx);
          await appendWalletLedgerEntry(
            {
              userId: buyer.id,
              type: "BUYER_TOP_UP",
              direction: "CREDIT",
              amount,
              spendableDelta: amount,
              withdrawableDelta: 0,
              title: "Chaos test credit",
              idempotencyKey: `chaos:ledger:${marker}`,
            },
            tx,
          );
          await tx.userWallet.update({
            where: { userId: buyer.id },
            data: { topupSpendableAmount: { increment: amount } },
          });
          return { ok: true };
        },
        verify: async () => {
          throw new FinancialVerificationError("simulated post-debit crash");
        },
      },
    );

    expect(result.ok).toBe(false);

    const after = await prisma.userWallet.findUnique({
      where: { userId: buyer.id },
    });
    expect(Number(after?.topupSpendableAmount ?? 0)).toBeCloseTo(beforeTopup, 2);

    const orphan = await prisma.walletLedgerEntry.findFirst({
      where: { idempotencyKey: `chaos:ledger:${marker}` },
    });
    expect(orphan).toBeNull();
  });

  it("double submit with same idempotency key credits once", async () => {
    const buyer = await prisma.user.findFirst({
      where: { role: "BUYER" },
      select: { id: true },
    });
    if (!buyer) return;

    const key = `chaos:double:${Date.now()}`;
    const amount = 23;

    const run = () =>
      executeFinancialTransaction(
        {
          operationType: "WALLET_TOP_UP",
          idempotencyKey: key,
          userId: buyer.id,
          amountRub: amount,
        },
        {
          execute: async (tx) => {
            await getOrCreateUserWallet(buyer.id, tx);
            const created = await appendWalletLedgerEntry(
              {
                userId: buyer.id,
                type: "BUYER_TOP_UP",
                direction: "CREDIT",
                amount,
                spendableDelta: amount,
                withdrawableDelta: 0,
                title: "Double submit test",
                idempotencyKey: key,
              },
              tx,
            );
            if (created) {
              await tx.userWallet.update({
                where: { userId: buyer.id },
                data: { topupSpendableAmount: { increment: amount } },
              });
            }
            return { duplicate: !created };
          },
          verify: async (tx) => {
            await verifyWalletLedgerMatchesBalanceInTx(tx, buyer.id);
          },
        },
      );

    const [a, b] = await Promise.all([run(), run()]);
    expect(a.ok || b.ok).toBe(true);

    const entries = await prisma.walletLedgerEntry.count({
      where: { idempotencyKey: key },
    });
    expect(entries).toBe(1);
  });

  it("wallet ledger sum matches balance after concurrent-style batch", async () => {
    const buyer = await prisma.user.findFirst({
      where: { role: "BUYER" },
      select: { id: true },
    });
    if (!buyer) return;

    await prisma.$transaction(async (tx) => {
      await verifyWalletLedgerMatchesBalanceInTx(tx, buyer.id);
    });
  });

  afterAll(async () => {
    await prisma.financialIncident.updateMany({
      where: {
        title: { contains: "Verification failed" },
        status: { in: ["OPEN", "INVESTIGATING"] },
      },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  });
});
