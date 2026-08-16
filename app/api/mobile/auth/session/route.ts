import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileAuthDecisionReport } from "@/lib/mobile/auth-decision";

/**
 * Mobile session API — reports JWT session strategy without replacing web auth.
 */
export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "status";
  const decision = buildMobileAuthDecisionReport();
  const session = await auth();

  if (action === "status") {
    return NextResponse.json(
      withMobileApiContract(
        {
          supported: true,
          authenticated: Boolean(session?.user?.id),
          userId: session?.user?.id ?? null,
          role: session?.user?.role ?? null,
          mode: "web_session_cookie_jwt",
          decision: decision.decision,
          strategy: decision.strategy,
          sessionMaxAgeSec: decision.sessionMaxAgeSec,
          refresh: decision.refreshImplemented ? "AVAILABLE" : "NOT_IMPLEMENTED",
          logout: "WEB_PRIMARY",
          tokenIssuance: "JWT_VIA_NEXTAUTH",
          blockers: decision.blockers,
          detail: decision.summary,
        },
        "mobile-auth-v1",
      ),
    );
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
