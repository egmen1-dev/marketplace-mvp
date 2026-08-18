import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { generateBetaExitReport } from "@/lib/product-operations/beta";

export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const report = await generateBetaExitReport();
  return NextResponse.json(withMobileApiContract(report, "beta-exit-report"));
}
