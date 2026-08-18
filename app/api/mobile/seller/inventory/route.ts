import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerInventoryFromRequest } from "@/lib/mobile/seller-inventory-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = await buildMobileSellerInventoryFromRequest(request);
  return NextResponse.json(withMobileApiContract(payload, "mobile-seller-inventory-v1"));
}
