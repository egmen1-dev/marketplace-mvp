/**
 * E2E fixture: reset buyer for seller first-entry flow tests.
 */

import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const BUYER_EMAIL = "buyer@demo.lot";

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

  const buyer = await prisma.user.findUnique({
    where: { email: BUYER_EMAIL },
    include: { sellerProfile: true },
  });
  if (!buyer) {
    return NextResponse.json({ error: "Demo buyer missing" }, { status: 500 });
  }

  if (buyer.sellerProfile) {
    const sellerId = buyer.sellerProfile.id;
    await prisma.sellerExperienceProgress.deleteMany({ where: { sellerId } });
    await prisma.product.deleteMany({ where: { sellerId } });
    await prisma.sellerBalance.deleteMany({ where: { sellerId } });
    await prisma.sellerProfile.delete({ where: { id: sellerId } });
  }

  await prisma.user.update({
    where: { id: buyer.id },
    data: { role: UserRole.BUYER },
  });

  return NextResponse.json({ ok: true, email: BUYER_EMAIL });
}

export async function DELETE(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buyer = await prisma.user.findUnique({
    where: { email: BUYER_EMAIL },
    include: { sellerProfile: true },
  });
  if (!buyer?.sellerProfile) {
    return NextResponse.json({ ok: true });
  }

  const sellerId = buyer.sellerProfile.id;
  await prisma.sellerExperienceProgress.deleteMany({ where: { sellerId } });
  await prisma.product.deleteMany({ where: { sellerId } });
  await prisma.sellerBalance.deleteMany({ where: { sellerId } });
  await prisma.sellerProfile.delete({ where: { id: sellerId } });
  await prisma.user.update({
    where: { id: buyer.id },
    data: { role: UserRole.BUYER },
  });

  return NextResponse.json({ ok: true });
}
