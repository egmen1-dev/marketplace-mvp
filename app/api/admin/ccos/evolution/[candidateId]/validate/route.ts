import { NextResponse } from "next/server";

import { runCandidateValidationPipeline } from "@/lib/ccos/evolution/pipeline";
import { evolutionPlatformGuard, requireEvolutionAdmin } from "@/lib/ccos/evolution/admin-auth";
import { handleEvolutionAdminError } from "@/lib/ccos/evolution/admin-route-utils";

type Params = { params: Promise<{ candidateId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const disabled = evolutionPlatformGuard();
  if (disabled) return disabled;

  try {
    await requireEvolutionAdmin();
    const { candidateId } = await params;
    const result = runCandidateValidationPipeline(candidateId);
    return NextResponse.json({ validation: result });
  } catch (err) {
    return handleEvolutionAdminError(err);
  }
}
