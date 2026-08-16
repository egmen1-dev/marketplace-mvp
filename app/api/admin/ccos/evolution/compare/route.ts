import { NextResponse } from "next/server";

import { compareBrainVersions } from "@/lib/ccos/evolution/provenance";
import { evolutionPlatformGuard, requireEvolutionAdmin } from "@/lib/ccos/evolution/admin-auth";
import { handleEvolutionAdminError } from "@/lib/ccos/evolution/admin-route-utils";

export async function GET(request: Request) {
  const disabled = evolutionPlatformGuard();
  if (disabled) return disabled;

  try {
    await requireEvolutionAdmin();
    const url = new URL(request.url);
    const v1 = url.searchParams.get("v1") ?? "";
    const v2 = url.searchParams.get("v2") ?? "";
    if (!v1 || !v2) {
      return NextResponse.json({ error: { code: "INVALID_PARAMS", message: "v1 and v2 required", retryable: false } }, { status: 400 });
    }
    return NextResponse.json(compareBrainVersions(v1, v2));
  } catch (err) {
    return handleEvolutionAdminError(err);
  }
}
