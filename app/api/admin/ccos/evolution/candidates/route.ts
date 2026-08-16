import { NextResponse } from "next/server";

import { applyWeightChange } from "@/lib/ccos/evolution/change-set";
import { createBrainCandidate, listCandidates } from "@/lib/ccos/evolution/candidate";
import { evolutionPlatformGuard, requireEvolutionAdmin } from "@/lib/ccos/evolution/admin-auth";
import { handleEvolutionAdminError } from "@/lib/ccos/evolution/admin-route-utils";
import { DEFAULT_BRAIN_POLICY_WEIGHTS } from "@/lib/ccos/evolution/types";

export async function GET() {
  const disabled = evolutionPlatformGuard();
  if (disabled) return disabled;

  try {
    await requireEvolutionAdmin();
    return NextResponse.json({ candidates: listCandidates() });
  } catch (err) {
    return handleEvolutionAdminError(err);
  }
}

export async function POST(request: Request) {
  const disabled = evolutionPlatformGuard();
  if (disabled) return disabled;

  try {
    const admin = await requireEvolutionAdmin();
    const body = await request.json().catch(() => ({}));

    const weights = { ...DEFAULT_BRAIN_POLICY_WEIGHTS };
    const entries = [];
    if (body.changeSet?.entries && Array.isArray(body.changeSet.entries)) {
      for (const entry of body.changeSet.entries) {
        entries.push(
          applyWeightChange(weights, String(entry.field), Number(entry.to), "WEIGHT_CHANGE"),
        );
      }
    } else if (typeof body.thumbnailWeight === "number") {
      entries.push(applyWeightChange(weights, "thumbnail", body.thumbnailWeight));
    }

    const candidate = createBrainCandidate({
      baseVersion: typeof body.baseVersion === "string" ? body.baseVersion : undefined,
      changeSetEntries: entries,
      evidence: {
        knowledgeIds: body.evidence?.knowledgeIds,
        experimentIds: body.evidence?.experimentIds,
        hypothesisIds: body.evidence?.hypothesisIds,
      },
      reason: typeof body.reason === "string" ? body.reason : "admin candidate",
      createdBy: admin.email,
      policyWeights: weights,
      candidateVersionLabel: typeof body.candidateVersionLabel === "string" ? body.candidateVersionLabel : undefined,
    });

    return NextResponse.json({ candidate }, { status: 201 });
  } catch (err) {
    return handleEvolutionAdminError(err);
  }
}
