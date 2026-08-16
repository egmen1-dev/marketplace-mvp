import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { recordTelemetryEvent } from "@/lib/product-operations/telemetry";
import { recordSessionStep } from "@/lib/product-operations/sessions";

export type MobileTelemetryEvent = {
  appVersion: string;
  platform: "android" | "ios" | "webview";
  screen?: string;
  event: string;
  errorCode?: string;
  sessionId?: string;
  deviceId?: string;
  versionCode?: number;
};

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => ({}))) as Partial<MobileTelemetryEvent>;
  if (!body.event || !body.appVersion || !body.platform) {
    return NextResponse.json({ error: "event, appVersion, platform required" }, { status: 400 });
  }

  await recordTelemetryEvent({
    eventType: body.event,
    screen: body.screen,
    sessionId: body.sessionId,
    deviceId: body.deviceId,
    versionCode: body.versionCode,
    versionName: body.appVersion,
    platform: body.platform,
    metadata: body.errorCode ? { errorCode: body.errorCode } : undefined,
  });

  if (body.sessionId && body.screen) {
    await recordSessionStep({
      sessionId: body.sessionId,
      screen: body.screen,
      action: body.event,
      deviceId: body.deviceId,
      versionCode: body.versionCode,
    }).catch(() => null);
  }

  return NextResponse.json(
    withMobileApiContract(
      {
        accepted: true,
        recorded: true,
        contractVersion: "product-ops-telemetry-v1",
      },
      body.event,
    ),
  );
}
