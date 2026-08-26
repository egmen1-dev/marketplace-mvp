import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/features/auth";
import { recordShadowHumanReview } from "@/lib/moderation/staging-shadow/blind-review";

const bodySchema = z.object({
  batchId: z.string().min(1),
  humanDecision: z.enum(["APPROVE", "NEEDS_CHANGES", "REJECT", "MANUAL_REVIEW"]),
  humanReason: z.string().max(2000).optional(),
  reviewerId: z.string().min(1).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  const { id: productId } = await context.params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const result = await recordShadowHumanReview({
      batchId: parsed.data.batchId,
      productId,
      reviewerId: parsed.data.reviewerId ?? session.id,
      humanDecision: parsed.data.humanDecision,
      humanReason: parsed.data.humanReason,
    });
    return NextResponse.json({
      ok: true,
      comparison: result.comparison,
      systemDecision: result.evaluation.policyDecision,
      systemRecommendation: result.review.systemRecommendation,
      rulesTriggered: result.evaluation.rulesTriggered,
      revealed: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message === "DUPLICATE_REVIEW") {
      return NextResponse.json({ error: "DUPLICATE_REVIEW" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
