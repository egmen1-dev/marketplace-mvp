import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { buildMobileAuthDecisionReport } from "@/lib/mobile/auth-decision";
import { MobileAuthError, mobileAuthLogin } from "@/lib/mobile/auth/service";
import { resolveMobileDeepLink } from "@/lib/mobile/deep-links";

/**
 * Mobile session API — login + status (web NextAuth unchanged).
 */
export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "status";
  const decision = buildMobileAuthDecisionReport();

  if (action === "login") {
    try {
      const email = typeof body.email === "string" ? body.email : "";
      const password = typeof body.password === "string" ? body.password : "";
      const deviceId = typeof body.deviceId === "string" ? body.deviceId : undefined;
      const pendingDeepLink = typeof body.pendingDeepLink === "string" ? body.pendingDeepLink : undefined;

      const tokens = await mobileAuthLogin({ email, password, deviceId });
      const destination = pendingDeepLink ? resolveMobileDeepLink(pendingDeepLink) : null;

      return NextResponse.json(
        withMobileApiContract(
          {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            sessionId: tokens.sessionId,
            userId: tokens.userId,
            role: tokens.role,
            pendingDeepLink: pendingDeepLink ?? null,
            destination,
            decision: decision.decision,
          },
          tokens.sessionId,
        ),
      );
    } catch (err) {
      if (err instanceof MobileAuthError) {
        return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
      }
      throw err;
    }
  }

  if (action === "status") {
    return NextResponse.json(
      withMobileApiContract(
        {
          supported: true,
          authenticated: false,
          mode: "mobile_jwt_refresh_v1",
          decision: decision.decision,
          strategy: decision.strategy,
          refresh: decision.refreshImplemented ? "AVAILABLE" : "NOT_IMPLEMENTED",
          logout: "AVAILABLE",
          blockers: decision.blockers,
          detail: decision.summary,
        },
        "mobile-auth-v1",
      ),
    );
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
