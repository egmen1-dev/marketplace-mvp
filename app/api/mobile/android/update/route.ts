import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildLegacyAndroidUpdatePayload } from "@/lib/mobile-release-platform/update-service";

export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const versionCode = Number(url.searchParams.get("versionCode") ?? "1");
  const deviceId = url.searchParams.get("deviceId") ?? undefined;
  const channel = url.searchParams.get("channel") ?? undefined;

  const payload = await buildLegacyAndroidUpdatePayload({
    clientVersionCode: Number.isFinite(versionCode) ? versionCode : 1,
    deviceId,
    channel,
  });

  return NextResponse.json(withMobileApiContract(payload, payload.latestVersion));
}
