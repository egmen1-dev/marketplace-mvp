import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

export type MobileTelemetryEvent = {
  appVersion: string;
  platform: "android" | "ios" | "webview";
  screen?: string;
  event: string;
  errorCode?: string;
};

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => ({}))) as Partial<MobileTelemetryEvent>;
  if (!body.event || !body.appVersion || !body.platform) {
    return NextResponse.json({ error: "event, appVersion, platform required" }, { status: 400 });
  }

  return NextResponse.json(
    withMobileApiContract(
      {
        accepted: true,
        recorded: false,
        contractVersion: "mobile-telemetry-v1",
        note: "Telemetry contract accepted — persistence optional in MVP",
      },
      body.event,
    ),
  );
}
