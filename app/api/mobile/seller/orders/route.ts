import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerOrdersFromRequest } from "@/lib/mobile/seller-orders-data";
import type { MobileSellerOrderFilter } from "@/lib/mobile/seller-orders-types";
import { MOBILE_SELLER_ORDER_FILTERS } from "@/lib/mobile/seller-orders-types";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const filterRaw = searchParams.get("filter");
  const filter = MOBILE_SELLER_ORDER_FILTERS.includes(filterRaw as MobileSellerOrderFilter)
    ? (filterRaw as MobileSellerOrderFilter)
    : "all";

  const page = await buildMobileSellerOrdersFromRequest(request, {
    cursor: searchParams.get("cursor"),
    query: searchParams.get("q"),
    filter,
  });

  return NextResponse.json(
    withMobileApiContract(page, `seller-orders-${filter}-p${searchParams.get("cursor") ?? "1"}`),
  );
}
