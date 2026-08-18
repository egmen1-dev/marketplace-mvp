import { NextResponse } from "next/server";

import { buildProductReleaseVerdictReport } from "@/lib/product-operations/release/verdict";

export const dynamic = "force-dynamic";

/** EPIC 84 — automatic release GO / WATCH / NO-GO from POP metrics */
export async function GET() {
  const p0Count = Number(process.env.EPIC84_P0_COUNT ?? "0");
  const physicalPass = process.env.PHYSICAL_ANDROID_PASS === "true";

  const report = await buildProductReleaseVerdictReport({ p0Count, physicalPass });
  return NextResponse.json(report);
}
