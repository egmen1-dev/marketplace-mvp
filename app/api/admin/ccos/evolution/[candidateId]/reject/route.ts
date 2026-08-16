import { NextResponse } from "next/server";

import { rejectCandidate } from "@/lib/ccos/evolution/approval";
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
    const reason = typeof body.reason === "string" ? body.reason : "";
    const approval = rejectCandidate({ candidateId, reviewedBy: admin.email, reason });
    return NextResponse.json({ approval });
  } catch (err) {
    return handleEvolutionAdminError(err);
  }
}
