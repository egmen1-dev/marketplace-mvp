import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { isCcosTwinPlatformEnabled } from "@/lib/ccos/twin";

export function ccosTwinApiGuard(): NextResponse | null {
  const base = ccosApiGuard();
  if (base) return base;
  if (!isCcosTwinPlatformEnabled()) {
    return NextResponse.json({ error: "CCOS Twin Platform disabled" }, { status: 503 });
  }
  return null;
}
