#!/usr/bin/env node
/**
 * Daily finance invariant check — run against staging/production DB via DATABASE_URL.
 * Usage: node scripts/check-financial-invariants.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function num(v) {
  return Number(v ?? 0);
}

async function main() {
  const issues = [];

  const negativeTopup = await prisma.userWallet.count({
    where: {
      OR: [
        { topupSpendableAmount: { lt: 0 } },
        { bonusSpendableAmount: { lt: 0 } },
      ],
    },
  });
  if (negativeTopup > 0) issues.push(`negative spendable buckets: ${negativeTopup}`);

  const negativeSeller = await prisma.sellerBalance.count({
    where: {
      OR: [
        { availableAmount: { lt: 0 } },
        { reservedForPayoutAmount: { lt: 0 } },
        { pendingAmount: { lt: 0 } },
      ],
    },
  });
  if (negativeSeller > 0) issues.push(`negative seller balances: ${negativeSeller}`);

  const duplicateKeys = await prisma.walletLedgerEntry.groupBy({
    by: ["idempotencyKey"],
    where: { idempotencyKey: { not: null } },
    _count: { idempotencyKey: true },
  });
  const dupCount = duplicateKeys.filter((row) => row._count.idempotencyKey > 1).length;
  if (dupCount > 0) issues.push(`duplicate idempotency keys: ${dupCount}`);

  const sellers = await prisma.sellerBalance.findMany({
    select: {
      sellerId: true,
      availableAmount: true,
      reservedForPayoutAmount: true,
    },
  });
  for (const s of sellers) {
    const withdrawable = num(s.availableAmount) - num(s.reservedForPayoutAmount);
    if (withdrawable < -0.01) {
      issues.push(`seller ${s.sellerId}: withdrawable < 0`);
    }
  }

  const openPayouts = await prisma.payoutRequest.findMany({
    where: { status: { in: ["UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
    select: { id: true, amount: true, sellerId: true },
  });
  for (const p of openPayouts) {
    const bal = await prisma.sellerBalance.findUnique({
      where: { sellerId: p.sellerId },
    });
    if (!bal) continue;
    const withdrawable =
      num(bal.availableAmount) - num(bal.reservedForPayoutAmount);
    if (num(p.amount) > withdrawable + 0.01) {
      issues.push(`payout ${p.id}: exceeds withdrawable`);
    }
  }

  const completedWithReserve = await prisma.payoutRequest.count({
    where: {
      status: "COMPLETED",
      seller: { balance: { reservedForPayoutAmount: { gt: 0 } } },
    },
  });
  if (completedWithReserve > 0) {
    issues.push(`completed payouts with reserved balance: ${completedWithReserve}`);
  }

  const report = {
    checkedAt: new Date().toISOString(),
    usersWithWallet: await prisma.userWallet.count(),
    ledgerEntries: await prisma.walletLedgerEntry.count(),
    openPayoutRequests: openPayouts.length,
    issues,
    ok: issues.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  process.exit(report.ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
