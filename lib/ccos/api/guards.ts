import { NextResponse } from "next/server";

import { isCcosEnabled } from "@/lib/ccos/flags";
import { isCcosKnowledgePlatformEnabled } from "@/lib/ccos/knowledge/flags";

export function ccosApiGuard(): NextResponse | null {
  if (!isCcosEnabled()) {
    return NextResponse.json({ error: "CCOS disabled" }, { status: 503 });
  }
  return null;
}

export function ccosKnowledgeApiGuard(): NextResponse | null {
  const base = ccosApiGuard();
  if (base) return base;
  if (!isCcosKnowledgePlatformEnabled()) {
    return NextResponse.json({ error: "CCOS Knowledge Platform disabled" }, { status: 503 });
  }
  return null;
}
