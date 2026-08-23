import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerOrdersFromRequest } from "@/lib/mobile/seller-orders-data";

/** GET /api/mobile/seller/orders?tab=new|in_progress|completed */
export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = await buildMobileSellerOrdersFromRequest(request);
  return NextResponse.json(withMobileApiContract(payload, `seller-orders-${payload.tab}`));
}
