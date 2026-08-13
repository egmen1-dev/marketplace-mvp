/**
 * E2E helper — simulate paid promotion without Stripe (staging/local only).
 */
import { NextResponse } from "next/server";

import { finalizePromotionOrderForTesting } from "@/lib/promotion/billing/finalize";
import {
  createPromotionOrder,
} from "@/lib/promotion/billing/orders";
import { prisma } from "@/lib/prisma";

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

  let body: { productId?: string; sellerProfileId?: string; planName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const productId = body.productId?.trim();
  const sellerProfileId = body.sellerProfileId?.trim();
  const planName = (body.planName ?? "STARTER").trim();

  if (!productId || !sellerProfileId) {
    return NextResponse.json(
      { error: "productId and sellerProfileId required" },
      { status: 400 },
    );
  }

  const plan = await prisma.promotionPlan.findFirst({
    where: { name: planName, active: true },
    select: { id: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const order = await createPromotionOrder(
    sellerProfileId,
    productId,
    plan.id,
  );
  await finalizePromotionOrderForTesting(order.id);

  return NextResponse.json({
    promotionOrderId: order.id,
    productId,
    status: "ACTIVE",
  });
}
