import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildBetaDashboardSnapshot } from "@/lib/product-operations/beta";

export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const snapshot = await buildBetaDashboardSnapshot();
  return NextResponse.json(withMobileApiContract(snapshot, "beta-dashboard"));
}
