#!/usr/bin/env tsx
/**
 * Investor demo: realistic buyers, sellers, wallet history, payouts, promotions.
 * Usage: tsx scripts/seed-financial-investor-demo.ts
 */
import bcrypt from "bcryptjs";
import { Prisma, WalletLedgerType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEMO_PASSWORD = "demo1234";

async function upsertDemoUser(input: {
  email: string;
  name: string;
  role: "BUYER" | "SELLER" | "ADMIN";
  storeName?: string;
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash,
    },
    update: { name: input.name },
  });

  if (input.role === "SELLER" && input.storeName) {
    await prisma.sellerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        storeName: input.storeName,
        slug: input.storeName.toLowerCase().replace(/\s+/g, "-"),
        verifiedAt: new Date(),
      },
      update: { storeName: input.storeName },
    });
  }

  return user;
}

async function creditWallet(userId: string, amount: number, title: string, daysAgo: number) {
  const createdAt = new Date(Date.now() - daysAgo * 86400000);
  const key = `investor:topup:${userId}:${amount}:${daysAgo}`;

  const existing = await prisma.walletLedgerEntry.findUnique({
    where: { idempotencyKey: key },
  });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    await tx.userWallet.upsert({
      where: { userId },
      create: { userId, topupSpendableAmount: amount },
      update: { topupSpendableAmount: { increment: amount } },
    });
    await tx.walletLedgerEntry.create({
      data: {
        userId,
        type: WalletLedgerType.BUYER_TOP_UP,
        direction: "CREDIT",
        amount: new Prisma.Decimal(amount.toFixed(2)),
        spendableDelta: new Prisma.Decimal(amount.toFixed(2)),
        withdrawableDelta: new Prisma.Decimal("0"),
        title,
        subtitle: "Банковская карта ·••• 4242",
        idempotencyKey: key,
        createdAt,
      },
    });
  });
}

async function main() {
  console.log("Seeding investor financial demo data…");

  const buyers = await Promise.all(
    [
      ["investor.buyer1@demo.lot", "Анна Петрова"],
      ["investor.buyer2@demo.lot", "Игорь Смирнов"],
      ["investor.buyer3@demo.lot", "Мария Козлова"],
    ].map(([email, name]) =>
      upsertDemoUser({ email, name, role: "BUYER" }),
    ),
  );

  const sellers = await Promise.all(
    [
      ["investor.seller1@demo.lot", "TechHub Store"],
      ["investor.seller2@demo.lot", "Style Market"],
      ["investor.seller3@demo.lot", "Home & Garden Pro"],
    ].map(([email, storeName]) =>
      upsertDemoUser({ email, name: storeName, role: "SELLER", storeName }),
    ),
  );

  for (const [i, buyer] of buyers.entries()) {
    await creditWallet(buyer.id, 5000 + i * 2500, "Пополнение кошелька", 30 - i * 5);
    await creditWallet(buyer.id, 3000, "Пополнение кошелька", 14 - i * 2);
  }

  for (const seller of sellers) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: seller.id },
    });
    if (!profile) continue;

    await prisma.sellerBalance.upsert({
      where: { sellerId: profile.id },
      create: {
        sellerId: profile.id,
        pendingAmount: 12500,
        availableAmount: 48200,
        paidAmount: 156000,
      },
      update: {
        pendingAmount: 12500,
        availableAmount: 48200,
        paidAmount: 156000,
      },
    });
  }

  console.log(`Done: ${buyers.length} buyers, ${sellers.length} sellers with wallet history.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
