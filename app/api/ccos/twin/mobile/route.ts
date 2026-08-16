import { NextResponse } from "next/server";
import { z } from "zod";

import { ccosTwinApiGuard } from "@/lib/ccos/api/twin-guards";
import {
  buildMarketplaceTwinDecisionReport,
  toMobileScenarioSimulatorResponse,
} from "@/lib/marketplace-cognitive-platform/twin";

const mobileSchema = z.object({
  productId: z.string(),
  scenarioId: z.string().optional(),
  action: z
    .enum([
      "replace_first_photo",
      "add_video",
      "change_price",
      "change_seo",
      "enable_promotion",
      "improve_description",
      "reorder_photos",
      "combined",
    ])
    .optional(),
});

const ACTION_TO_SCENARIO: Record<string, string> = {
  replace_first_photo: "scenario_photo",
  add_video: "scenario_video",
  change_price: "scenario_price_3",
  change_seo: "scenario_seo",
  enable_promotion: "scenario_promotion",
  improve_description: "scenario_description",
  reorder_photos: "scenario_reorder",
  combined: "scenario_combo",
};

/**
 * Mobile Scenario Simulator API
 */
export async function POST(request: Request) {
  const blocked = ccosTwinApiGuard();
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = mobileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid mobile payload" }, { status: 400 });
    }

    const scenarioIds = parsed.data.action
      ? [ACTION_TO_SCENARIO[parsed.data.action] ?? "scenario_photo"]
      : parsed.data.scenarioId
        ? [parsed.data.scenarioId]
        : undefined;

    const report = await buildMarketplaceTwinDecisionReport({
      productId: parsed.data.productId,
      scenarioIds,
    });
    if (!report) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const mobile = toMobileScenarioSimulatorResponse(report, scenarioIds?.[0]);
    if (!mobile) {
      return NextResponse.json({ error: "No scenario result" }, { status: 404 });
    }

    return NextResponse.json(mobile);
  } catch (err) {
    console.error("[ccos/twin/mobile]", err);
    return NextResponse.json({ error: "Mobile simulation failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const blocked = ccosTwinApiGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const scenarioId = url.searchParams.get("scenarioId") ?? undefined;
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const report = await buildMarketplaceTwinDecisionReport({ productId });
  if (!report) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const mobile = toMobileScenarioSimulatorResponse(report, scenarioId);
  if (!mobile) {
    return NextResponse.json({ error: "No scenario result" }, { status: 404 });
  }
  return NextResponse.json(mobile);
}
