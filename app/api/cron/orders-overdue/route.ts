import { NextResponse } from "next/server";

import { processOverdueOrders } from "@/features/order-lifecycle/lib/overdue-processor";

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
 * Railway / external cron: POST /api/cron/orders-overdue
 * Header: Authorization: Bearer $CRON_SECRET  or  x-cron-secret: $CRON_SECRET
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processOverdueOrders({ limit: 200 });
    return NextResponse.json({
      ok: true,
      scanned: result.scanned,
      marked: result.marked,
    });
  } catch (err) {
    console.error("[cron/orders-overdue]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
