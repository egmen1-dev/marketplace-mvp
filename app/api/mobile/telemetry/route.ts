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
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => ({}))) as Partial<MobileTelemetryEvent>;
  if (!body.event || !body.appVersion || !body.platform) {
    return NextResponse.json({ error: "event, appVersion, platform required" }, { status: 400 });
  }

  const metadata: Record<string, unknown> = { ...(body.metadata ?? {}) };
  if (body.errorCode) metadata.errorCode = body.errorCode;

  await recordTelemetryEvent({
    eventType: body.event,
    screen: body.screen,
    sessionId: body.sessionId,
    deviceId: body.deviceId,
    versionCode: body.versionCode,
    versionName: body.appVersion,
    platform: body.platform,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  });

  if (body.sessionId && body.screen) {
    await recordSessionStep({
      sessionId: body.sessionId,
      screen: body.screen,
      action: body.event,
      deviceId: body.deviceId,
      versionCode: body.versionCode,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
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
