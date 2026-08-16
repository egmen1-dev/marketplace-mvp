import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { buildMobileClientConfig } from "@/lib/mobile/client-config";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { currentMarketplaceBrainVersion } from "@/lib/ccos/knowledge/versions";

/**
 * Mobile client configuration — feature/module matrix decoupled from backend deploy
 * GET /api/mobile/config
 */
export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const config = buildMobileClientConfig();
  return NextResponse.json(
    withMobileApiContract(
      config,
      `${config.apiVersion}:${currentMarketplaceBrainVersion()}`,
    ),
  );
}
