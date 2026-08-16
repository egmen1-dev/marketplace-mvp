import { NextResponse } from "next/server";

import { ccosTwinApiGuard } from "@/lib/ccos/api/twin-guards";
import { buildMarketplaceTwinReplay } from "@/lib/marketplace-cognitive-platform/twin";

/**
 * Twin Replay — GET /api/ccos/twin/replay?productId=
 */
export async function GET(request: Request) {
  const blocked = ccosTwinApiGuard();
  if (blocked) return blocked;

  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const replay = await buildMarketplaceTwinReplay(productId);
  return NextResponse.json({ productId, replay, advisoryOnly: true });
}
