import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerProductDetailFromRequest } from "@/lib/mobile/seller-products-data";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;
  const detail = await buildMobileSellerProductDetailFromRequest(request, id);
  if (!detail) {
    return NextResponse.json(withMobileApiContract({ error: "NOT_FOUND" }, `seller-product-${id}`), {
      status: 404,
    });
  }

  return NextResponse.json(withMobileApiContract(detail, `seller-product-${id}`));
}
