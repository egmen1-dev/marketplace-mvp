import { NextResponse } from "next/server";
import { z } from "zod";

import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  event: z.enum(["page_load_start", "page_load_success", "page_load_error"]),
  route: z.string().max(200),
  webview: z.boolean().optional(),
  ms: z.number().int().nonnegative().optional(),
  message: z.string().max(300).optional(),
});

/** Accept client page-load telemetry — no PII, no cookies required. */
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

  const { event, route, webview, ms, message } = parsed.data;
  log.info(event, {
    route,
    webview: webview ?? false,
    ms,
    detail: message,
  });

  return NextResponse.json({ ok: true });
}
