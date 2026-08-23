import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerStorefront } from "@/lib/mobile/seller-storefront-data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/mobile/seller/[id] — public seller trust block for storefront. */
export async function GET(_request: Request, context: RouteContext) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const { id } = await context.params;
  const payload = await buildMobileSellerStorefront(id);

  if (!payload) {
    return NextResponse.json({ error: "Продавец не найден" }, { status: 404 });
  }

  return NextResponse.json(withMobileApiContract(payload, `seller-storefront-${payload.id}`));
}
