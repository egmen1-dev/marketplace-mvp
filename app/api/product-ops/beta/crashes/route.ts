import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { getCrashObservatory } from "@/lib/product-operations/beta/crash-observatory";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const days = Number(new URL(request.url).searchParams.get("days") ?? 7);
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 30);
  const crashes = await getCrashObservatory(days, limit);
  return NextResponse.json(
    withMobileApiContract(
      {
        days,
        heatmap: crashes,
        totalEvents: crashes.reduce((s, c) => s + c.count, 0),
      },
      "beta-crashes",
    ),
  );
}
