import { NextResponse } from "next/server";
import { z } from "zod";

import { ccosProductApiGuard } from "@/lib/ccos/api/product-guards";
import {
  advanceCaptureStep,
  buildMarketplaceProductUnderstanding,
  evaluateCaptureStep,
  startGuidedCapture,
} from "@/lib/marketplace-cognitive-platform/product";

const sessionSchema = z.object({
  productId: z.string().optional(),
});

const stepSchema = z.object({
  session: z.object({
    productId: z.string().optional(),
    steps: z.array(z.object({ id: z.string(), title: z.string(), instruction: z.string(), order: z.number() })),
    currentStep: z.number().int().min(0),
    advisoryOnly: z.literal(true),
  }),
  stepId: z.string(),
  photoCount: z.number().int().min(0).optional(),
  advance: z.boolean().optional(),
});

/**
 * Guided Mobile Capture
 * POST action=start | evaluate
 */
export async function POST(request: Request) {
  const blocked = ccosProductApiGuard();
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "start";

    if (action === "start") {
      const parsed = sessionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid start payload" }, { status: 400 });
      }
      const understanding = parsed.data.productId
        ? await buildMarketplaceProductUnderstanding(parsed.data.productId)
        : null;
      const session = startGuidedCapture(
        parsed.data.productId,
        understanding?.categoryPack.idealPhotos,
      );
      return NextResponse.json({ session, advisoryOnly: true });
    }

    if (action === "evaluate") {
      const parsed = stepSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid evaluate payload" }, { status: 400 });
      }

      const understanding = parsed.data.session.productId
        ? await buildMarketplaceProductUnderstanding(parsed.data.session.productId)
        : null;

      const evaluation = evaluateCaptureStep({
        stepId: parsed.data.stepId,
        photoCount: parsed.data.photoCount,
        understanding: understanding ?? undefined,
      });

      let session = parsed.data.session;
      if (parsed.data.advance && evaluation.pass) {
        session = advanceCaptureStep(session);
      }

      return NextResponse.json({ evaluation, session, advisoryOnly: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[ccos/product/capture]", err);
    return NextResponse.json({ error: "Capture failed" }, { status: 500 });
  }
}
