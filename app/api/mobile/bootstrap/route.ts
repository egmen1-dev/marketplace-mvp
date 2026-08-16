import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { buildMobileBootstrapPayload } from "@/lib/mobile/bootstrap";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

/**
 * Mobile app bootstrap — stable entrypoint for Android/iOS shell
 * GET /api/mobile/bootstrap
 */
export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = buildMobileBootstrapPayload();
  return NextResponse.json(
    withMobileApiContract(payload, `${payload.apiVersion}:${payload.brainCapabilities.brainVersion}`),
  );
}
