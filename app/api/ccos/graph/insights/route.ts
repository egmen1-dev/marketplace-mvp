import { NextResponse } from "next/server";

import { ccosGraphApiGuard } from "@/lib/ccos/api/graph-guards";
import {
  buildAndCacheMarketplaceGraphInsights,
  buildMobileGraphInsights,
  buildMarketplaceKnowledgeGraph,
  toCompactMobileGraphInsights,
} from "@/lib/marketplace-cognitive-platform/graph";
import { getCachedGraphInsights } from "@/lib/ccos/graph";
import { isCognitiveProductReportAvailable, getMarketplaceBrainReport } from "@/lib/marketplace-cognitive-platform";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

/**
 * Mobile Graph Insights API
 * GET /api/ccos/graph/insights?productId=
 */
export async function GET(request: Request) {
  const blocked = ccosGraphApiGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const compact = url.searchParams.get("compact") === "1" || url.searchParams.get("format") === "mobile";

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const cached = getCachedGraphInsights(productId);
  if (cached) {
    const payload = compact
      ? { insights: toCompactMobileGraphInsights(cached.insights), cached: true }
      : { insights: cached.insights, cached: true };
    return NextResponse.json(
      withMobileApiContract(payload, cached.syncVersion),
    );
  }

  const observations = isCognitiveProductReportAvailable()
    ? (await getMarketplaceBrainReport(productId))?.observations
    : undefined;

  const { insights } = await buildAndCacheMarketplaceGraphInsights({
    productId,
    observations,
  });

  const entry = getCachedGraphInsights(productId);
  const payload = compact
    ? { insights: toCompactMobileGraphInsights(insights), cached: false }
    : { insights, cached: false };

  return NextResponse.json(
    withMobileApiContract(payload, entry?.syncVersion ?? insights.productId),
  );
}

export async function POST(request: Request) {
  const blocked = ccosGraphApiGuard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : null;
  const compact = body.compact === true || body.format === "mobile";

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const graph = await buildMarketplaceKnowledgeGraph({ productId });
  const insights = buildMobileGraphInsights({ productId, graph });
  const payload = compact
    ? { insights: toCompactMobileGraphInsights(insights) }
    : { insights };

  return NextResponse.json(
    withMobileApiContract(payload, `${graph.version}:${graph.propagatedConfidence.toFixed(2)}`),
  );
}
