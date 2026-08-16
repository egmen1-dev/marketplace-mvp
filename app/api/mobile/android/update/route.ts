import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildAndroidUpdatePayload } from "@/lib/mobile/android-update";

export async function GET() {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const payload = buildAndroidUpdatePayload();
  return NextResponse.json(withMobileApiContract(payload, payload.latestVersion));
}
