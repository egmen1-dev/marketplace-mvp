import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";

/**
 * Release Readiness Checklist
 * GET /api/mobile/readiness
 */
export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const report = runReleaseReadinessCheck();
  return NextResponse.json(report);
}
