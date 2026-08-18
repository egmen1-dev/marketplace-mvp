import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerProductsFromRequest } from "@/lib/mobile/seller-products-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const page = await buildMobileSellerProductsFromRequest(request, {
    cursor: searchParams.get("cursor"),
    query: searchParams.get("q"),
    filter: searchParams.get("filter"),
    sort: searchParams.get("sort"),
  });

  const cacheKey = [
    "seller-products",
    searchParams.get("cursor") ?? "1",
    searchParams.get("filter") ?? "all",
    searchParams.get("sort") ?? "updated_desc",
    searchParams.get("q") ?? "",
  ].join("-");

  return NextResponse.json(withMobileApiContract(page, cacheKey));
}
