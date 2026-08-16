import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileClientConfigWithRemoteConfig } from "@/lib/product-operations/remote-config";
import { currentMarketplaceBrainVersion } from "@/lib/ccos/knowledge/versions";

/**
 * Mobile client configuration — feature/module matrix + remote config (EPIC-79)
 * GET /api/mobile/config
 */
export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const config = await buildMobileClientConfigWithRemoteConfig();
  return NextResponse.json(
    withMobileApiContract(
      config,
      `${config.apiVersion}:${currentMarketplaceBrainVersion()}:rc${config.configVersion}`,
    ),
  );
}
