import { NextResponse } from "next/server";

import { ccosGraphApiGuard } from "@/lib/ccos/api/graph-guards";
import {
  buildAndCacheMarketplaceGraphInsights,
  buildMobileGraphInsights,
  buildMarketplaceKnowledgeGraph,
} from "@/lib/marketplace-cognitive-platform/graph";
import { getCachedGraphInsights } from "@/lib/ccos/graph";
import { isCognitiveProductReportAvailable, getMarketplaceBrainReport } from "@/lib/marketplace-cognitive-platform";

/**
 * Mobile Graph Insights API
 * GET /api/ccos/graph/insights?productId=
 */
export async function GET(request: Request) {
  const blocked = ccosGraphApiGuard();
  if (blocked) return blocked;

  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const cached = getCachedGraphInsights(productId);
  if (cached) {
    return NextResponse.json({ insights: cached.insights, cached: true, advisoryOnly: true });
  }

  const observations = isCognitiveProductReportAvailable()
    ? (await getMarketplaceBrainReport(productId))?.observations
    : undefined;

  const { graph, insights } = await buildAndCacheMarketplaceGraphInsights({
    productId,
    observations,
  });

  return NextResponse.json({ graph, insights, cached: false, advisoryOnly: true });
}

export async function POST(request: Request) {
  const blocked = ccosGraphApiGuard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : null;
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const graph = await buildMarketplaceKnowledgeGraph({ productId });
  const insights = buildMobileGraphInsights({ productId, graph });
  return NextResponse.json({ graph, insights, advisoryOnly: true });
}
