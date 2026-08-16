import { NextResponse } from "next/server";

import { promoteApprovedCandidate } from "@/lib/ccos/evolution/promotion";
import { startPostPromotionMonitoring } from "@/lib/ccos/evolution/monitoring";
import { evolutionPlatformGuard, requireEvolutionAdmin } from "@/lib/ccos/evolution/admin-auth";
import { handleEvolutionAdminError } from "@/lib/ccos/evolution/admin-route-utils";

type Params = { params: Promise<{ candidateId: string }> };

export async function POST(request: Request, { params }: Params) {
  const disabled = evolutionPlatformGuard();
  if (disabled) return disabled;

  try {
    const admin = await requireEvolutionAdmin();
    const { candidateId } = await params;
    const body = await request.json().catch(() => ({}));
    const result = promoteApprovedCandidate({
      candidateId,
      approvedBy: admin.email,
      reason: typeof body.reason === "string" ? body.reason : "promoted",
    });
    const monitoring = startPostPromotionMonitoring(candidateId);
    return NextResponse.json({ ...result, monitoring });
  } catch (err) {
    return handleEvolutionAdminError(err);
  }
}
