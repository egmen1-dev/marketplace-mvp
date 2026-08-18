import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerPromotionFromRequest } from "@/lib/mobile/seller-promotion-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = await buildMobileSellerPromotionFromRequest(request);
  return NextResponse.json(withMobileApiContract(payload, "mobile-seller-promotion-v1"));
}
