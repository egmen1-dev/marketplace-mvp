import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { validateAllJourneys } from "@/lib/product-operations/beta";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const days = Number(new URL(request.url).searchParams.get("days") ?? 7);
  const journeys = await validateAllJourneys(days);
  return NextResponse.json(withMobileApiContract(journeys, "beta-journey-validation"));
}
