import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { patchMobileSellerOrderStatusFromRequest } from "@/lib/mobile/seller-orders-data";
import { toMobileSellerOrderStatus } from "@/lib/mobile/seller-orders";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PATCH /api/mobile/seller/orders/:id/status — seller order status transition */
export async function PATCH(request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;
  const result = await patchMobileSellerOrderStatusFromRequest(request, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    withMobileApiContract(
      {
        id,
        status: toMobileSellerOrderStatus(result.status),
        rawStatus: result.status,
      },
      `seller-order-status-${id}`,
    ),
  );
}
