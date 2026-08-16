import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileUpdatePayload } from "@/lib/mobile-release-platform/update-service";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const versionCode = Number(url.searchParams.get("versionCode") ?? "1");
  const deviceId = url.searchParams.get("deviceId") ?? undefined;
  const channel = url.searchParams.get("channel") as "CLOSED_ALPHA" | undefined;

  const clientVersionCode = Number.isFinite(versionCode) ? versionCode : 1;
  const payload = await buildMobileUpdatePayload({
    clientVersionCode,
    deviceId,
    channel,
  });

  return NextResponse.json(withMobileApiContract(payload, payload.latestVersion));
}
