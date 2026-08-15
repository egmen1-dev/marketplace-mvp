/**
 * Seed investor demo financial data on staging/local.
 * Creates demo buyers/sellers with wallet activity markers.
 *
 * Run on staging:
 *   railway run --service web-v2 -- npx tsx scripts/seed-financial-demo-data.ts
 */

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import { appendWalletLedgerEntry, getOrCreateUserWallet } from "../lib/lot-wallet/queries";
import { setSellerAvailableBalanceForE2E } from "../lib/seller-payout/lifecycle";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "demo1234";
const MARKER = "INVESTOR-DEMO";

type DemoUser = {
  email: string;
  name: string;
  role: UserRole;
  isSeller?: boolean;
  topup?: number;
  sellerAvailable?: number;
};

const USERS: DemoUser[] = [
  {
    email: "investor-buyer-a@demo.lot",
    name: "Investor Buyer A",
    role: UserRole.BUYER,
    topup: 12_000,
  },
  {
    email: "investor-buyer-b@demo.lot",
    name: "Investor Buyer B",
    role: UserRole.BUYER,
    topup: 8_500,
  },
  {
    email: "investor-seller-a@demo.lot",
    name: "Investor Seller A",
    role: UserRole.SELLER,
    isSeller: true,
    topup: 3_000,
    sellerAvailable: 18_000,
  },
  {
    email: "investor-seller-b@demo.lot",
    name: "Investor Seller B",
    role: UserRole.SELLER,
    isSeller: true,
    topup: 1_500,
    sellerAvailable: 9_500,
  },
];

async function upsertUser(spec: DemoUser) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: spec.email },
    create: {
      email: spec.email,
      name: spec.name,
      passwordHash,
      role: spec.role,
      emailVerified: new Date(),
    },
    update: { name: spec.name, role: spec.role },
  });

  if (spec.isSeller) {
    await prisma.sellerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        storeName: `${spec.name} Store`,
        storeSlug: spec.email.split("@")[0]!.replace(/\./g, "-"),
      },
      update: {},
    });
  }

  if (spec.topup && spec.topup > 0) {
    await prisma.$transaction(async (tx) => {
      await getOrCreateUserWallet(user.id, tx);
      const key = `${MARKER}:topup:${user.id}`;
      const created = await appendWalletLedgerEntry(
        {
          userId: user.id,
          type: "BUYER_TOP_UP",
          direction: "CREDIT",
          amount: spec.topup!,
          spendableDelta: spec.topup!,
          withdrawableDelta: 0,
          title: "Пополнение кошелька",
          subtitle: MARKER,
          referenceType: "DEMO_SEED",
          referenceId: key,
          idempotencyKey: key,
        },
        tx,
      );
      if (created) {
        await tx.userWallet.update({
          where: { userId: user.id },
          data: { topupSpendableAmount: { increment: spec.topup! } },
        });
      }
    });
  }

  if (spec.isSeller && spec.sellerAvailable != null) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: user.id },
    });
    if (profile) {
      await setSellerAvailableBalanceForE2E(profile.id, spec.sellerAvailable);
    }
  }

  return user;
}

async function main() {
  console.log(`Seeding ${MARKER} demo users…`);
  for (const spec of USERS) {
    const user = await upsertUser(spec);
    console.log(`  ✓ ${user.email}`);
  }
  console.log("\nDemo credentials: password demo1234");
  console.log("Primary acceptance users remain: buyer@demo.lot / seller@demo.lot / admin@demo.lot");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
