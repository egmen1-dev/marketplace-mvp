import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { buildMobileDashboard } from "@/lib/mobile/dashboard";
import { isCognitiveProductReportAvailable } from "@/lib/marketplace-cognitive-platform";

/**
 * Unified mobile dashboard — Brain + Genome + Graph + Twin
 * GET /api/mobile/dashboard?productId=
 */
export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  if (!isCognitiveProductReportAvailable()) {
    return NextResponse.json({ error: "Cognitive platform unavailable" }, { status: 503 });
  }

  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const dashboard = await buildMobileDashboard(productId);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard unavailable" }, { status: 404 });
  }

  return NextResponse.json(dashboard);
}
