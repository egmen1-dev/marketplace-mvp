import { NextResponse } from "next/server";

import { approveCandidate } from "@/lib/ccos/evolution/approval";
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
    const result = approveCandidate({
      candidateId,
      reviewedBy: admin.email,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleEvolutionAdminError(err);
  }
}
