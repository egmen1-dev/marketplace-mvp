import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { listInventoryHistory } from "@/lib/mobile/seller-inventory-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return NextResponse.json(
      withMobileApiContract({ items: [], nextCursor: null, hasMore: false }, "mobile-seller-inventory-history-v1"),
    );
  }

  const url = new URL(request.url);
  const page = await listInventoryHistory({
    sellerProfileId: user.sellerProfileId,
    productId: url.searchParams.get("productId"),
    cursor: url.searchParams.get("cursor"),
  });

  return NextResponse.json(withMobileApiContract(page, "mobile-seller-inventory-history-v1"));
}
