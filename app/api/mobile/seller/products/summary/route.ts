import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerProductsSummaryFromRequest } from "@/lib/mobile/seller-products-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const summary = await buildMobileSellerProductsSummaryFromRequest(request);
  if (!summary) {
    return NextResponse.json(
      withMobileApiContract(
        { active: 0, drafts: 0, moderation: 0, needsFix: 0, outOfStock: 0, lowStock: 0, hidden: 0 },
        "seller-products-summary-empty",
      ),
      { status: 401 },
    );
  }

  return NextResponse.json(withMobileApiContract(summary, "seller-products-summary"));
}
