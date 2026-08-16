import { NextResponse } from "next/server";

import { buildMarketplaceQualityReport, loadMarketplaceQualityAudit } from "@/lib/product-operations/marketplace-quality/report";

export const dynamic = "force-dynamic";

/** EPIC 84 Wave 0 — Marketplace Quality Report (before/after index) */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const previous = url.searchParams.get("previousIndex");
  const previousIndex = previous ? Number(previous) : null;

  const audit = loadMarketplaceQualityAudit();
  const report = buildMarketplaceQualityReport(audit, Number.isFinite(previousIndex) ? previousIndex : null);
  return NextResponse.json(report);
}
