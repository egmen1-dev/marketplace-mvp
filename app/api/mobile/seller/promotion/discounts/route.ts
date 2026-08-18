import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { listPromotionDiscounts } from "@/lib/mobile/seller-promotion-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return NextResponse.json(withMobileApiContract({ items: [] }, "mobile-seller-promotion-discounts-v1"));
  }

  const items = await listPromotionDiscounts(user.sellerProfileId);
  return NextResponse.json(withMobileApiContract({ items }, "mobile-seller-promotion-discounts-v1"));
}
