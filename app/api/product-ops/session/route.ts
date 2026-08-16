import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { recordSessionStep } from "@/lib/product-operations/sessions";

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    screen?: string;
    action?: string;
    deviceId?: string;
    versionCode?: number;
  };

  if (!body.sessionId || !body.screen) {
    return NextResponse.json({ error: "sessionId and screen required" }, { status: 400 });
  }

  const step = await recordSessionStep({
    sessionId: body.sessionId,
    screen: body.screen,
    action: body.action,
    deviceId: body.deviceId,
    versionCode: body.versionCode,
  });

  return NextResponse.json(
    withMobileApiContract(
      { stepOrder: step.stepOrder, recorded: true },
      `${body.sessionId}:${step.stepOrder}`,
    ),
  );
}
