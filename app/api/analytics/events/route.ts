import { NextResponse } from "next/server";
import { z } from "zod";

import { ANALYTICS_EVENT_NAMES, type AnalyticsEventName } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  event: z.enum(ANALYTICS_EVENT_NAMES as [AnalyticsEventName, ...AnalyticsEventName[]]),
  route: z.string().max(200).optional(),
  entityId: z.string().max(100).optional(),
  webview: z.boolean().optional(),
  visitorId: z.string().max(64).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  utmContent: z.string().max(100).optional(),
});

/** Accept client conversion events — no PII, no auth required. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!raw.trim()) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await trackServerEvent(parsed.data);

  return NextResponse.json({ ok: true });
}
