import { NextResponse } from "next/server";

import { processExpiredProtectionWindows } from "@/lib/trust/protection-cron";
import { captureError } from "@/lib/monitoring/capture-error";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const header =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ??
    request.headers.get("x-cron-secret")?.trim() ??
    "";
  return header === expected;
}

/**
 * Railway / external cron hook: POST /api/cron/trust-protection
 * Auto-confirms orders when buyer protection window expires.
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    log.warn("cron_trust_protection_unauthorized", { result: "denied" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processExpiredProtectionWindows({ limit: 100 });
    log.info("cron_trust_protection_completed", {
      result: "ok",
      scanned: result.scanned,
      autoConfirmed: result.autoConfirmed,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    captureError("cron_trust_protection_failed", err, {
      entityType: "cron",
      route: "/api/cron/trust-protection",
    });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
