import { NextResponse } from "next/server";
import { z } from "zod";

import { ccosTwinApiGuard } from "@/lib/ccos/api/twin-guards";
import {
  cacheTwinSimulation,
  getCachedTwinSimulation,
  listPendingTwinCacheSync,
  markTwinCacheSynced,
} from "@/lib/ccos/twin";
import {
  buildMarketplaceTwinDecisionReport,
  toOfflineTwinCachePayload,
} from "@/lib/marketplace-cognitive-platform/twin";

const syncSchema = z.object({
  productId: z.string(),
  action: z.enum(["pull", "push", "ack"]).optional(),
});

/**
 * Offline Simulation Cache — GET list/pending, POST pull/push/ack
 */
export async function GET(request: Request) {
  const blocked = ccosTwinApiGuard();
  if (blocked) return blocked;

  const productId = new URL(request.url).searchParams.get("productId");
  if (productId) {
    const cached = getCachedTwinSimulation(productId);
    if (!cached) {
      return NextResponse.json({ error: "No cache entry" }, { status: 404 });
    }
    return NextResponse.json({
      entry: cached,
      payload: toOfflineTwinCachePayload(cached.report),
      advisoryOnly: true,
    });
  }

  return NextResponse.json({
    pending: listPendingTwinCacheSync(),
    advisoryOnly: true,
  });
}

export async function POST(request: Request) {
  const blocked = ccosTwinApiGuard();
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid cache payload" }, { status: 400 });
    }

    const action = parsed.data.action ?? "pull";

    if (action === "ack") {
      markTwinCacheSynced(parsed.data.productId);
      return NextResponse.json({ ok: true, advisoryOnly: true });
    }

    const report = await buildMarketplaceTwinDecisionReport({
      productId: parsed.data.productId,
    });
    if (!report) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const entry = cacheTwinSimulation({
      productId: parsed.data.productId,
      app: "marketplace",
      report,
      pendingSync: action === "push",
    });

    return NextResponse.json({
      entry,
      payload: toOfflineTwinCachePayload(report),
      advisoryOnly: true,
    });
  } catch (err) {
    console.error("[ccos/twin/cache]", err);
    return NextResponse.json({ error: "Cache sync failed" }, { status: 500 });
  }
}
