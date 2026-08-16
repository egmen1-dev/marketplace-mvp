import { NextResponse } from "next/server";
import { z } from "zod";

import { ccosTwinApiGuard } from "@/lib/ccos/api/twin-guards";
import { buildMarketplaceTwinDecisionReport } from "@/lib/marketplace-cognitive-platform/twin";

const simulateSchema = z.object({
  productId: z.string(),
  app: z.enum(["marketplace", "daos", "quicksale", "advertising", "search"]).optional(),
  scenarioIds: z.array(z.string()).optional(),
  monteCarloIterations: z.number().int().min(8).max(200).optional(),
});

/**
 * Universal Twin API — POST /api/ccos/twin/simulate
 */
export async function POST(request: Request) {
  const blocked = ccosTwinApiGuard();
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = simulateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid simulate payload" }, { status: 400 });
    }

    const app = parsed.data.app ?? "marketplace";
    if (app !== "marketplace") {
      return NextResponse.json(
        { error: "Full twin simulation currently requires app=marketplace" },
        { status: 400 },
      );
    }

    const report = await buildMarketplaceTwinDecisionReport({
      productId: parsed.data.productId,
      scenarioIds: parsed.data.scenarioIds,
      monteCarloIterations: parsed.data.monteCarloIterations,
    });
    if (!report) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ report, app, advisoryOnly: true });
  } catch (err) {
    console.error("[ccos/twin/simulate]", err);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const blocked = ccosTwinApiGuard();
  if (blocked) return blocked;

  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const report = await buildMarketplaceTwinDecisionReport({ productId });
  if (!report) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return NextResponse.json({ report, advisoryOnly: true });
}
