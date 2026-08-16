import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerHomeFromRequest } from "@/lib/mobile/seller-home-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = await buildMobileSellerHomeFromRequest(request);
  return NextResponse.json(withMobileApiContract(payload, "mobile-seller-home-v1"));
}
