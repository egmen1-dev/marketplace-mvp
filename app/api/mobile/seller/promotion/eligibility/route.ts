import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { loadPromotionEligibility } from "@/lib/mobile/seller-promotion-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return NextResponse.json(withMobileApiContract({ items: [] }, "mobile-seller-promotion-eligibility-v1"));
  }

  const items = await loadPromotionEligibility(user.sellerProfileId, productId);
  return NextResponse.json(withMobileApiContract({ items }, "mobile-seller-promotion-eligibility-v1"));
}
