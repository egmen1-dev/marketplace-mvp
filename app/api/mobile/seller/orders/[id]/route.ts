import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerOrderDetailFromRequest } from "@/lib/mobile/seller-orders-data";
import { SellerServiceError } from "@/features/seller/queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;

  try {
    const detail = await buildMobileSellerOrderDetailFromRequest(request, id);
    if (!detail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(withMobileApiContract(detail, `seller-order-${id}`));
  } catch (err) {
    if (err instanceof SellerServiceError && err.status === 404) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
