import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";

/**
 * Mobile session API foundation — uses existing web session model.
 * POST body: { action: "status" } until dedicated mobile token flow is approved.
 */
export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "status";

  if (action === "status") {
    return NextResponse.json(
      withMobileApiContract(
        {
          supported: true,
          mode: "web_session_cookie",
          tokenIssuance: "NOT_IMPLEMENTED",
          refresh: "NOT_IMPLEMENTED",
          logout: "NOT_IMPLEMENTED",
          detail: "Use existing NextAuth/session routes; mobile token endpoints reserved",
        },
        "mobile-auth-v0",
      ),
    );
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
