import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { updateMobileSellerPromotionDiscountFromRequest } from "@/lib/mobile/seller-promotion-data";

type Params = { params: Promise<{ productId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { productId } = await params;
  const body = (await request.json()) as { compareAt?: number | null };
  if (body.compareAt === undefined) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateMobileSellerPromotionDiscountFromRequest(request, productId, {
    compareAt: body.compareAt,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "NOT_FOUND" ? 404 : 400 });
  }

  return NextResponse.json(withMobileApiContract(result, "mobile-seller-promotion-discount-v1"));
}
