import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileSellerHomePayload } from "@/lib/mobile/seller-home";

export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  return NextResponse.json(
    withMobileApiContract(buildMobileSellerHomePayload(), "mobile-seller-home-v1"),
  );
}
