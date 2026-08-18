import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerIntelligenceFromRequest } from "@/lib/mobile/seller-intelligence-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = await buildMobileSellerIntelligenceFromRequest(request);
  return NextResponse.json(withMobileApiContract(payload, "mobile-seller-intelligence-v1"));
}
