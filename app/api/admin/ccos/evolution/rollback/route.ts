import { NextResponse } from "next/server";

import { executeEvolutionRollback } from "@/lib/ccos/evolution/monitoring";
import { evolutionPlatformGuard, requireEvolutionAdmin } from "@/lib/ccos/evolution/admin-auth";
import { handleEvolutionAdminError } from "@/lib/ccos/evolution/admin-route-utils";

export async function POST(request: Request) {
  const disabled = evolutionPlatformGuard();
  if (disabled) return disabled;

  try {
    const admin = await requireEvolutionAdmin();
    const body = await request.json().catch(() => ({}));
    const result = executeEvolutionRollback({
      fromVersion: String(body.fromVersion ?? ""),
      toVersion: String(body.toVersion ?? ""),
      approvedBy: admin.email,
      requestedBy: admin.email,
      reason: String(body.reason ?? "manual rollback"),
      candidateId: typeof body.candidateId === "string" ? body.candidateId : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleEvolutionAdminError(err);
  }
}
