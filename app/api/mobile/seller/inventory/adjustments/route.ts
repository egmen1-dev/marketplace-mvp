import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import {
  batchUpdateMobileSellerInventoryFromRequest,
  updateMobileSellerInventoryStockFromRequest,
} from "@/lib/mobile/seller-inventory-data";
import type { InventoryAdjustInput } from "@/lib/seller-inventory-center/types";

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = (await request.json()) as InventoryAdjustInput | { items?: InventoryAdjustInput[] };

  if ("items" in body && Array.isArray(body.items)) {
    const result = await batchUpdateMobileSellerInventoryFromRequest(request, { items: body.items });
    return NextResponse.json(withMobileApiContract(result, "mobile-seller-inventory-batch-adjust-v1"));
  }

  if (!("productId" in body) || !body.productId) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateMobileSellerInventoryStockFromRequest(request, body.productId, body);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "NOT_FOUND" ? 404 : 400 });
  }

  return NextResponse.json(withMobileApiContract(result, "mobile-seller-inventory-adjust-v1"));
}
