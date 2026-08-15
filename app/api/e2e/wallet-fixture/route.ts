/**
 * E2E fixture: seed LOT Wallet balances for financial acceptance tests.
 * Never expose without E2E_FIXTURE_SECRET.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { appendWalletLedgerEntry, getOrCreateUserWallet } from "@/lib/lot-wallet/queries";
import { setSellerAvailableBalanceForE2E } from "@/lib/seller-payout/lifecycle";

const DEFAULT_EMAIL = "seller@demo.lot";

function authorize(request: Request): boolean {
  const expected = process.env.E2E_FIXTURE_SECRET?.trim();
  if (!expected) return false;
  const got = request.headers.get("x-e2e-secret")?.trim();
  return Boolean(got && got === expected);
}

/** Read wallet + ledger snapshot for financial acceptance (no mutations). */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim() || DEFAULT_EMAIL;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { sellerProfile: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const wallet = await prisma.userWallet.findUnique({ where: { userId: user.id } });
  const ledgerEntryCount = await prisma.walletLedgerEntry.count({
    where: { userId: user.id },
  });
  const sellerBalance = user.sellerProfile
    ? await prisma.sellerBalance.findUnique({
        where: { sellerId: user.sellerProfile.id },
      })
    : null;

  return NextResponse.json({
    userId: user.id,
    email,
    topupSpendableAmount: Number(wallet?.topupSpendableAmount ?? 0),
    bonusSpendableAmount: Number(wallet?.bonusSpendableAmount ?? 0),
    sellerAvailableAmount: Number(sellerBalance?.availableAmount ?? 0),
    sellerReservedAmount: Number(sellerBalance?.reservedForPayoutAmount ?? 0),
    sellerPendingAmount: Number(sellerBalance?.pendingAmount ?? 0),
    sellerPaidAmount: Number(sellerBalance?.paidAmount ?? 0),
    ledgerEntryCount,
  });
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    email?: string;
    topupAmount?: number;
    bonusAmount?: number;
    sellerAvailableAmount?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim() || DEFAULT_EMAIL;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { sellerProfile: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const topupAmount = Math.max(0, Number(body.topupAmount ?? 0));
  const bonusAmount = Math.max(0, Number(body.bonusAmount ?? 0));
  const sellerAvailableAmount =
    body.sellerAvailableAmount != null
      ? Math.max(0, Number(body.sellerAvailableAmount))
      : null;

  await prisma.$transaction(async (tx) => {
    await getOrCreateUserWallet(user.id, tx);

    if (topupAmount > 0) {
      const key = `e2e:topup:${user.id}:${Date.now()}`;
      const created = await appendWalletLedgerEntry(
        {
          userId: user.id,
          type: "BUYER_TOP_UP",
          direction: "CREDIT",
          amount: topupAmount,
          spendableDelta: topupAmount,
          withdrawableDelta: 0,
          title: "Пополнение кошелька",
          subtitle: "E2E fixture",
          referenceType: "E2E_FIXTURE",
          referenceId: key,
          idempotencyKey: key,
        },
        tx,
      );
      if (created) {
        await tx.userWallet.update({
          where: { userId: user.id },
          data: { topupSpendableAmount: { increment: topupAmount } },
        });
      }
    }

    if (bonusAmount > 0) {
      const key = `e2e:bonus:${user.id}:${Date.now()}`;
      const created = await appendWalletLedgerEntry(
        {
          userId: user.id,
          type: "BONUS_CREDIT",
          direction: "CREDIT",
          amount: bonusAmount,
          spendableDelta: bonusAmount,
          withdrawableDelta: 0,
          title: "Бонусы ЛОТ",
          subtitle: "E2E fixture",
          referenceType: "E2E_FIXTURE",
          referenceId: key,
          idempotencyKey: key,
        },
        tx,
      );
      if (created) {
        await tx.userWallet.update({
          where: { userId: user.id },
          data: { bonusSpendableAmount: { increment: bonusAmount } },
        });
      }
    }
  });

  if (sellerAvailableAmount != null && user.sellerProfile) {
    await setSellerAvailableBalanceForE2E(user.sellerProfile.id, sellerAvailableAmount);
  }

  const wallet = await prisma.userWallet.findUnique({ where: { userId: user.id } });
  const ledgerEntryCount = await prisma.walletLedgerEntry.count({
    where: { userId: user.id },
  });
  const sellerBalance = user.sellerProfile
    ? await prisma.sellerBalance.findUnique({
        where: { sellerId: user.sellerProfile.id },
      })
    : null;

  return NextResponse.json({
    userId: user.id,
    email,
    topupSpendableAmount: Number(wallet?.topupSpendableAmount ?? 0),
    bonusSpendableAmount: Number(wallet?.bonusSpendableAmount ?? 0),
    sellerAvailableAmount: Number(sellerBalance?.availableAmount ?? 0),
    sellerReservedAmount: Number(sellerBalance?.reservedForPayoutAmount ?? 0),
    sellerPendingAmount: Number(sellerBalance?.pendingAmount ?? 0),
    sellerPaidAmount: Number(sellerBalance?.paidAmount ?? 0),
    ledgerEntryCount,
  });
}

export async function DELETE(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let email = DEFAULT_EMAIL;
  try {
    const body = (await request.json()) as { email?: string };
    if (body.email?.trim()) email = body.email.trim();
  } catch {
    // optional body
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { sellerProfile: true },
  });
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  await prisma.walletLedgerEntry.deleteMany({ where: { userId: user.id } });
  await prisma.userWallet.deleteMany({ where: { userId: user.id } });
  if (user.sellerProfile) {
    await prisma.sellerBalance.updateMany({
      where: { sellerId: user.sellerProfile.id },
      data: {
        availableAmount: 0,
        reservedForPayoutAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
