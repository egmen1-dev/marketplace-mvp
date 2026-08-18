import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { getPerformanceObservatory } from "@/lib/product-operations/beta/performance-observatory";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const days = Number(new URL(request.url).searchParams.get("days") ?? 7);
  const metrics = await getPerformanceObservatory(days);
  return NextResponse.json(
    withMobileApiContract(
      {
        days,
        metrics,
        sampleNote: "Percentiles require sufficient telemetry samples; count field per metric",
      },
      "beta-performance",
    ),
  );
}
