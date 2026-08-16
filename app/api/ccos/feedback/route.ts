import { NextResponse } from "next/server";
import { z } from "zod";

import { ccosKnowledgeApiGuard } from "@/lib/ccos/api/guards";
import { recordSellerFeedback } from "@/lib/ccos/knowledge";

const feedbackSchema = z.object({
  productId: z.string().min(1),
  recommendationId: z.string().min(1),
  recommendationTitle: z.string().min(1),
  outcome: z.enum(["helped", "not_helped", "partial"]),
  comment: z.string().max(2000).optional(),
});

/**
 * POST /api/ccos/feedback
 */
export async function POST(request: Request) {
  const blocked = ccosKnowledgeApiGuard();
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid feedback", issues: parsed.error.flatten() }, { status: 400 });
    }

    const record = recordSellerFeedback(parsed.data);
    return NextResponse.json({ ok: true, record, advisoryOnly: true });
  } catch (err) {
    console.error("[ccos/feedback]", err);
    return NextResponse.json({ error: "Feedback failed" }, { status: 500 });
  }
}
