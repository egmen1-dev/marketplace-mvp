import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { recordFeedback } from "@/lib/product-operations/feedback";

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => ({}))) as {
    content?: string;
    screen?: string;
    deviceId?: string;
    versionCode?: number;
    userId?: string;
    category?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const item = await recordFeedback({
    content: body.content.trim(),
    screen: body.screen,
    deviceId: body.deviceId,
    versionCode: body.versionCode,
    userId: body.userId,
    source: "mobile",
    category: body.category as import("@/lib/product-operations/beta/types").BetaFeedbackCategory | undefined,
    metadata: body.metadata,
  });

  return NextResponse.json(
    withMobileApiContract(
      {
        id: item.id,
        classification: item.classification,
        confidence: item.confidence,
        recorded: true,
      },
      item.id,
    ),
  );
}
