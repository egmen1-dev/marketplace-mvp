import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { buildMobileBootstrapWithRemoteConfig } from "@/lib/product-operations/remote-config";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

/**
 * Mobile app bootstrap — stable entrypoint for Android/iOS shell
 * GET /api/mobile/bootstrap
 */
export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = await buildMobileBootstrapWithRemoteConfig();
  return NextResponse.json(
    withMobileApiContract(payload, `${payload.apiVersion}:${payload.brainCapabilities.brainVersion}`),
  );
}
