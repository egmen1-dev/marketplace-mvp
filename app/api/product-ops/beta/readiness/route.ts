import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildClosedBetaReadinessDashboard } from "@/lib/product-operations/beta/readiness-dashboard";

export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const dashboard = await buildClosedBetaReadinessDashboard();
  return NextResponse.json(withMobileApiContract(dashboard, "closed-beta-readiness"));
}
