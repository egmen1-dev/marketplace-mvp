import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { isCcosProductPlatformEnabled } from "@/lib/ccos/product";

export function ccosProductApiGuard(): NextResponse | null {
  const base = ccosApiGuard();
  if (base) return base;
  if (!isCcosProductPlatformEnabled()) {
    return NextResponse.json({ error: "CCOS Product Platform disabled" }, { status: 503 });
  }
  return null;
}
