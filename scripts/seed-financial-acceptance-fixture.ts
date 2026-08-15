/**
 * One-off staging acceptance fixture: seed LOT Wallet balances for demo accounts.
 * Requires DATABASE_URL pointing at staging Postgres.
 *
 * Usage:
 *   npx tsx scripts/seed-financial-acceptance-fixture.ts
 *   npx tsx scripts/seed-financial-acceptance-fixture.ts --reset
 */
import { prisma } from "@/lib/prisma";
import { appendWalletLedgerEntry, getOrCreateUserWallet } from "@/lib/lot-wallet/queries";
import { setSellerAvailableBalanceForE2E } from "@/lib/seller-payout/lifecycle";

const DEMO_EMAIL = "seller@demo.lot";
const TOPUP_AMOUNT = 5000;
const SELLER_AVAILABLE = 20000;
const BONUS_AMOUNT = 0;

async function resetUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.walletLedgerEntry.deleteMany({ where: { userId: user.id } });
  await prisma.userWallet.deleteMany({ where: { userId: user.id } });
}

async function seedUser(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { sellerProfile: true },
  });
  if (!user) {
    console.warn(`skip: user not found ${email}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await getOrCreateUserWallet(user.id, tx);
    const topupKey = `acceptance:topup:${user.id}:5000`;
    const created = await appendWalletLedgerEntry(
      {
        userId: user.id,
        type: "BUYER_TOP_UP",
        direction: "CREDIT",
        amount: TOPUP_AMOUNT,
        spendableDelta: TOPUP_AMOUNT,
        withdrawableDelta: 0,
        title: "Пополнение кошелька",
        subtitle: "Acceptance fixture",
        referenceType: "ACCEPTANCE_FIXTURE",
        referenceId: topupKey,
        idempotencyKey: topupKey,
      },
      tx,
    );
    if (created) {
      await tx.userWallet.update({
        where: { userId: user.id },
        data: { topupSpendableAmount: { increment: TOPUP_AMOUNT } },
      });
    }

    if (BONUS_AMOUNT > 0) {
      const bonusKey = `acceptance:bonus:${user.id}:${BONUS_AMOUNT}`;
      const bonusCreated = await appendWalletLedgerEntry(
        {
          userId: user.id,
          type: "BONUS_CREDIT",
          direction: "CREDIT",
          amount: BONUS_AMOUNT,
          spendableDelta: BONUS_AMOUNT,
          withdrawableDelta: 0,
          title: "Бонусы ЛОТ",
          subtitle: "Acceptance fixture",
          referenceType: "ACCEPTANCE_FIXTURE",
          referenceId: bonusKey,
          idempotencyKey: bonusKey,
        },
        tx,
      );
      if (bonusCreated) {
        await tx.userWallet.update({
          where: { userId: user.id },
          data: { bonusSpendableAmount: { increment: BONUS_AMOUNT } },
        });
      }
    }
  });

  if (user.sellerProfile) {
    await setSellerAvailableBalanceForE2E(user.sellerProfile.id, SELLER_AVAILABLE);
  }

  const wallet = await prisma.userWallet.findUnique({ where: { userId: user.id } });
  const balance = user.sellerProfile
    ? await prisma.sellerBalance.findUnique({ where: { sellerId: user.sellerProfile.id } })
    : null;

  console.log(
    JSON.stringify({
      email,
      topupSpendable: Number(wallet?.topupSpendableAmount ?? 0),
      bonusSpendable: Number(wallet?.bonusSpendableAmount ?? 0),
      sellerAvailable: Number(balance?.availableAmount ?? 0),
    }),
  );
}

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) {
    await resetUser(DEMO_EMAIL);
    console.log("reset complete");
    return;
  }
  await seedUser(DEMO_EMAIL);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
