import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import {
  listPromotionCampaigns,
  publishMobileSellerPromotionFromRequest,
} from "@/lib/mobile/seller-promotion-data";
import type { PromotionPlanId } from "@/lib/seller-promotion-center/plans";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return NextResponse.json(withMobileApiContract({ items: [] }, "mobile-seller-promotion-campaigns-v1"));
  }

  const items = await listPromotionCampaigns(user.sellerProfileId);
  return NextResponse.json(withMobileApiContract({ items }, "mobile-seller-promotion-campaigns-v1"));
}

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = (await request.json()) as {
    productId?: string;
    planId?: PromotionPlanId;
    paymentMethod?: "wallet" | "card";
  };

  if (!body.productId || !body.planId) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const result = await publishMobileSellerPromotionFromRequest(request, {
    productId: body.productId,
    planId: body.planId,
    paymentMethod: body.paymentMethod ?? "wallet",
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(withMobileApiContract(result, "mobile-seller-promotion-publish-v1"));
}
