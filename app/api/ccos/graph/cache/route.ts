import { NextResponse } from "next/server";

import { ccosGraphApiGuard } from "@/lib/ccos/api/graph-guards";
import { getCachedGraphInsights, listCachedGraphProducts } from "@/lib/ccos/graph";
import { buildAndCacheMarketplaceGraphInsights } from "@/lib/marketplace-cognitive-platform/graph";

/**
 * Graph offline cache — GET /api/ccos/graph/cache?productId=
 */
export async function GET(request: Request) {
  const blocked = ccosGraphApiGuard();
  if (blocked) return blocked;

  const productId = new URL(request.url).searchParams.get("productId");
  if (productId) {
    const cached = getCachedGraphInsights(productId);
    if (!cached) {
      return NextResponse.json({ error: "No graph cache" }, { status: 404 });
    }
    return NextResponse.json({ entry: cached, advisoryOnly: true });
  }

  return NextResponse.json({
    products: listCachedGraphProducts(),
    advisoryOnly: true,
  });
}

export async function POST(request: Request) {
  const blocked = ccosGraphApiGuard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : null;
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const { graph, insights } = await buildAndCacheMarketplaceGraphInsights({ productId });
  return NextResponse.json({
    entry: getCachedGraphInsights(productId),
    graph,
    insights,
    advisoryOnly: true,
  });
}
