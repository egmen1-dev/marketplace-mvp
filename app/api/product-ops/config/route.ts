import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { getRemoteConfigMap } from "@/lib/product-operations/remote-config";
import { resolveActiveExperiments } from "@/lib/product-operations/experiments";
import { listProductFlags } from "@/lib/product-operations/feature-flags";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const surface = (url.searchParams.get("surface") ?? "mobile").toUpperCase() as "MOBILE" | "WEB" | "ALL";
  const deviceId = url.searchParams.get("deviceId") ?? "anonymous";

  const [config, flags, experiments] = await Promise.all([
    getRemoteConfigMap(surface === "MOBILE" ? "MOBILE" : surface === "WEB" ? "WEB" : "ALL"),
    listProductFlags(surface === "MOBILE" ? "MOBILE" : "ALL"),
    resolveActiveExperiments(deviceId),
  ]);

  return NextResponse.json(
    withMobileApiContract(
      {
        surface: surface.toLowerCase(),
        config,
        flags: flags.map((f) => ({ key: f.key, stage: f.stage, enabled: f.enabled })),
        experiments,
      },
      `pop-config-${Object.keys(config).length}`,
    ),
  );
}
