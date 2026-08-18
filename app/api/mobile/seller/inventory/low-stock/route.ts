import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerInventoryStockFromRequest } from "@/lib/mobile/seller-inventory-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const page = await buildMobileSellerInventoryStockFromRequest(request, {
    cursor: url.searchParams.get("cursor"),
    query: url.searchParams.get("q"),
    filter: "low",
    sort: "stock_asc",
  });

  return NextResponse.json(withMobileApiContract(page, "mobile-seller-inventory-low-stock-v1"));
}
