import { NextResponse } from "next/server";
import { z } from "zod";

import { ccosProductApiGuard } from "@/lib/ccos/api/product-guards";
import {
  buildMarketplaceProductUnderstanding,
  buildProductUnderstandingFromScan,
  toCameraScanResponse,
} from "@/lib/marketplace-cognitive-platform/product";
import { getMarketplaceBrainReport } from "@/lib/marketplace-cognitive-platform/brain/v1/report";
import { isCognitiveProductReportAvailable } from "@/lib/marketplace-cognitive-platform";

const scanSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(10000).optional(),
  imageCount: z.number().int().min(0).max(20).optional(),
  categoryHint: z.string().max(120).optional(),
  productId: z.string().optional(),
});

/**
 * Camera Product Scanner API
 * POST /api/ccos/product/scan — scan from title/photos metadata
 * GET /api/ccos/product/scan?productId= — scan existing product
 */
export async function POST(request: Request) {
  const blocked = ccosProductApiGuard();
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid scan payload" }, { status: 400 });
    }

    const understanding = parsed.data.productId
      ? await buildMarketplaceProductUnderstanding(parsed.data.productId)
      : await buildProductUnderstandingFromScan(parsed.data);

    if (!understanding) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let nextStep: string | null = null;
    if (parsed.data.productId && isCognitiveProductReportAvailable()) {
      const report = await getMarketplaceBrainReport(parsed.data.productId);
      nextStep = report?.nextBestAction?.title ?? null;
    }

    return NextResponse.json(toCameraScanResponse(understanding, nextStep));
  } catch (err) {
    console.error("[ccos/product/scan]", err);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const blocked = ccosProductApiGuard();
  if (blocked) return blocked;

  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const understanding = await buildMarketplaceProductUnderstanding(productId);
  if (!understanding) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const report = isCognitiveProductReportAvailable()
    ? await getMarketplaceBrainReport(productId)
    : null;

  return NextResponse.json(toCameraScanResponse(understanding, report?.nextBestAction?.title ?? null));
}
