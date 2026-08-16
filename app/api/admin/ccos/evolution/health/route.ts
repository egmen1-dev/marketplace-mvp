import { NextResponse } from "next/server";

import { buildEvolutionHealthReport } from "@/lib/ccos/evolution/health";
import { evolutionPlatformGuard, requireEvolutionAdmin } from "@/lib/ccos/evolution/admin-auth";
import { handleEvolutionAdminError } from "@/lib/ccos/evolution/admin-route-utils";

export async function GET() {
  const disabled = evolutionPlatformGuard();
  if (disabled) return disabled;

  try {
    await requireEvolutionAdmin();
    return NextResponse.json(buildEvolutionHealthReport());
  } catch (err) {
    return handleEvolutionAdminError(err);
  }
}
