import { NextResponse } from "next/server";

/**
 * Health check — structure only.
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "marketplace-mvp",
    timestamp: new Date().toISOString(),
  });
}
