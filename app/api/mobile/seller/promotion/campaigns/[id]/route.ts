import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import {
  getPromotionCampaignDetail,
  updateMobileSellerPromotionCampaignFromRequest,
} from "@/lib/mobile/seller-promotion-data";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await params;
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const campaign = await getPromotionCampaignDetail(user.sellerProfileId, id);
  if (!campaign) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(withMobileApiContract({ campaign }, "mobile-seller-promotion-campaign-v1"));
}

export async function PATCH(request: Request, { params }: Params) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await params;
  const body = (await request.json()) as { status?: "STARTED" | "PAUSED" | "ENDED" };
  if (!body.status) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateMobileSellerPromotionCampaignFromRequest(request, id, {
    status: body.status,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "NOT_FOUND" ? 404 : 400 });
  }

  return NextResponse.json(withMobileApiContract(result, "mobile-seller-promotion-campaign-v1"));
}
