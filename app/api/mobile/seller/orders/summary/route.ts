import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerOrdersSummaryFromRequest } from "@/lib/mobile/seller-orders-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const summary = await buildMobileSellerOrdersSummaryFromRequest(request);
  return NextResponse.json(withMobileApiContract(summary, "seller-orders-summary"));
}
