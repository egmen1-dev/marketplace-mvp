import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { isCcosGraphPlatformEnabled } from "@/lib/ccos/graph";

export function ccosGraphApiGuard(): NextResponse | null {
  const base = ccosApiGuard();
  if (base) return base;
  if (!isCcosGraphPlatformEnabled()) {
    return NextResponse.json({ error: "CCOS Graph Platform disabled" }, { status: 503 });
  }
  return null;
}
