import { NextResponse } from "next/server";
import { z } from "zod";

import { ccosKnowledgeApiGuard } from "@/lib/ccos/api/guards";
import { buildKnowledgeSnapshot, getBrainSnapshot } from "@/lib/ccos/knowledge";

/**
 * GET /api/ccos/snapshots?productId=&syncVersion=
 */
export async function GET(request: Request) {
  const blocked = ccosKnowledgeApiGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const syncVersion = url.searchParams.get("syncVersion") ?? undefined;

  if (productId) {
    const brain = getBrainSnapshot(productId, syncVersion);
    if (!brain) return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    return NextResponse.json({ brainSnapshot: brain, advisoryOnly: true });
  }

  return NextResponse.json({
    knowledgeSnapshot: buildKnowledgeSnapshot(["marketplace"]),
    advisoryOnly: true,
  });
}
