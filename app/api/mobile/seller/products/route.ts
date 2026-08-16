import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerProductsFromRequest } from "@/lib/mobile/seller-products-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const page = await buildMobileSellerProductsFromRequest(request, searchParams.get("cursor"));
  return NextResponse.json(withMobileApiContract(page, `seller-products-p${searchParams.get("cursor") ?? "1"}`));
}
