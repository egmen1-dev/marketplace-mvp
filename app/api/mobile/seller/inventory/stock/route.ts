import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerInventoryStockFromRequest } from "@/lib/mobile/seller-inventory-data";
import type { InventoryStockFilter, InventoryStockSort } from "@/lib/seller-inventory-center/types";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const query = url.searchParams.get("q");
  const filter = url.searchParams.get("filter") as InventoryStockFilter | null;
  const sort = url.searchParams.get("sort") as InventoryStockSort | null;

  const page = await buildMobileSellerInventoryStockFromRequest(request, {
    cursor,
    query,
    filter: filter ?? "all",
    sort: sort ?? "updated_desc",
  });

  return NextResponse.json(withMobileApiContract(page, "mobile-seller-inventory-stock-v1"));
}
