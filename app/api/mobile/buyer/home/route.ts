import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileBuyerHomePayload } from "@/lib/mobile/buyer-home";

export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  return NextResponse.json(
    withMobileApiContract(buildMobileBuyerHomePayload(), "mobile-buyer-home-v1"),
  );
}
