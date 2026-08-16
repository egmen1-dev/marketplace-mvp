import { NextResponse } from "next/server";
import { z } from "zod";

import { ccosKnowledgeApiGuard } from "@/lib/ccos/api/guards";
import {
  buildBrainSnapshotPayload,
  buildKnowledgeSnapshot,
  saveBrainSnapshot,
} from "@/lib/ccos/knowledge";
import { isCognitiveProductReportAvailable, getMarketplaceBrainReport } from "@/lib/marketplace-cognitive-platform";
import { toMobileBrainResponse } from "@/lib/marketplace-cognitive-platform/brain/mobile-api";

const querySchema = z.object({
  productId: z.string().min(1),
  query: z.string().optional(),
  device: z.enum(["mobile", "desktop", "tablet"]).optional(),
});

/**
 * Compact Mobile Brain API
 * GET /api/ccos/brain/mobile?productId=
 */
export async function GET(request: Request) {
  const blocked = ccosKnowledgeApiGuard();
  if (blocked) return blocked;

  if (!isCognitiveProductReportAvailable()) {
    return NextResponse.json({ error: "Marketplace Brain unavailable" }, { status: 503 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    productId: url.searchParams.get("productId"),
    query: url.searchParams.get("query") ?? undefined,
    device: url.searchParams.get("device") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const report = await getMarketplaceBrainReport(parsed.data.productId, {
    query: parsed.data.query,
    device: parsed.data.device,
  });

  if (!report) {
    return NextResponse.json({ error: "No brain report" }, { status: 404 });
  }

  const mobile = toMobileBrainResponse(report);
  saveBrainSnapshot(
    buildBrainSnapshotPayload({
      productId: report.productId,
      brainVersion: report.brainVersion,
      contextFingerprint: report.context.fingerprint,
      payload: mobile as unknown as Record<string, unknown>,
    }),
  );

  return NextResponse.json(mobile);
}

/**
 * Offline snapshots bundle
 * POST /api/ccos/brain/mobile — returns brain + knowledge snapshots
 */
export async function POST(request: Request) {
  const blocked = ccosKnowledgeApiGuard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : null;
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const report = await getMarketplaceBrainReport(productId);
  if (!report) return NextResponse.json({ error: "No brain report" }, { status: 404 });

  const brainSnapshot = buildBrainSnapshotPayload({
    productId,
    brainVersion: report.brainVersion,
    contextFingerprint: report.context.fingerprint,
    payload: toMobileBrainResponse(report) as unknown as Record<string, unknown>,
  });
  saveBrainSnapshot(brainSnapshot);

  return NextResponse.json({
    brainSnapshot,
    knowledgeSnapshot: buildKnowledgeSnapshot(["marketplace"]),
    advisoryOnly: true,
  });
}
