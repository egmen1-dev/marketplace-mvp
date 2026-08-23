import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { MobileAuthError, mobileAuthRefresh } from "@/lib/mobile/auth/service";

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
  if (!refreshToken) {
    return NextResponse.json({ error: "refreshToken required" }, { status: 400 });
  }

  try {
    const tokens = await mobileAuthRefresh(refreshToken);
    return NextResponse.json(
      withMobileApiContract(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          sessionId: tokens.sessionId,
          userId: tokens.userId,
          role: tokens.role,
        },
        tokens.sessionId,
      ),
    );
  } catch (err) {
    if (err instanceof MobileAuthError) {
      const status = err.code === "REFRESH_REPLAY" ? 403 : 401;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    throw err;
  }
}
