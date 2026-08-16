import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileBuyerHomeFromRequest } from "@/lib/mobile/buyer-home-data";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = await buildMobileBuyerHomeFromRequest(request);
  return NextResponse.json(withMobileApiContract(payload, "mobile-buyer-home-v1"));
}
