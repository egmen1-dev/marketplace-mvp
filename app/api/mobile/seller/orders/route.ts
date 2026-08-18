import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerOrdersFromRequest } from "@/lib/mobile/seller-orders-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const page = await buildMobileSellerOrdersFromRequest(request, searchParams.get("cursor"));
  return NextResponse.json(withMobileApiContract(page, `seller-orders-p${searchParams.get("cursor") ?? "1"}`));
}
