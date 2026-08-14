/**
 * E2E fixture: seed seller available balance + default payment method for payout tests.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSellerPaymentMethod } from "@/lib/seller-payout/methods";
import { setSellerAvailableBalanceForE2E } from "@/lib/seller-payout/lifecycle";

const SELLER_EMAIL = "seller@demo.lot";

function authorize(request: Request): boolean {
  const expected = process.env.E2E_FIXTURE_SECRET?.trim();
  if (!expected) return false;
  const got = request.headers.get("x-e2e-secret")?.trim();
  return Boolean(got && got === expected);
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { availableAmount?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sellerUser = await prisma.user.findUnique({
    where: { email: SELLER_EMAIL },
    include: { sellerProfile: true },
  });
  if (!sellerUser?.sellerProfile) {
    return NextResponse.json({ error: "Demo seller missing" }, { status: 500 });
  }

  const sellerId = sellerUser.sellerProfile.id;
  const availableAmount = Math.max(1000, Number(body.availableAmount ?? 42000));

  await setSellerAvailableBalanceForE2E(sellerId, availableAmount);

  let method = await prisma.sellerPaymentMethod.findFirst({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
  });
  if (!method) {
    const created = await createSellerPaymentMethod({
      sellerId,
      type: "CARD",
      detailsReference: "4276123456789012",
      label: "Демо карта",
    });
    method = await prisma.sellerPaymentMethod.findUniqueOrThrow({
      where: { id: created.id },
    });
  }

  return NextResponse.json({
    sellerProfileId: sellerId,
    availableAmount,
    paymentMethodId: method.id,
  });
}

export async function DELETE(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sellerUser = await prisma.user.findUnique({
    where: { email: SELLER_EMAIL },
    include: { sellerProfile: true },
  });
  if (!sellerUser?.sellerProfile) {
    return NextResponse.json({ ok: true });
  }

  const sellerId = sellerUser.sellerProfile.id;
  await prisma.payoutTransaction.deleteMany({ where: { sellerId } });
  await prisma.payoutRequest.deleteMany({ where: { sellerId } });
  await prisma.sellerPaymentMethod.deleteMany({ where: { sellerId } });
  await prisma.sellerBalance.updateMany({
    where: { sellerId },
    data: {
      availableAmount: 0,
      reservedForPayoutAmount: 0,
      paidAmount: 0,
    },
  });

  return NextResponse.json({ ok: true });
}
