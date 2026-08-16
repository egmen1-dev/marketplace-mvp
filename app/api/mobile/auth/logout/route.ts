import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { MobileAuthError, mobileAuthLogout } from "@/lib/mobile/auth/service";

export async function POST(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";
  if (!refreshToken) {
    return NextResponse.json({ error: "refreshToken required" }, { status: 400 });
  }

  try {
    const result = await mobileAuthLogout(refreshToken);
    return NextResponse.json(withMobileApiContract(result, "mobile-logout-v1"));
  } catch (err) {
    if (err instanceof MobileAuthError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
    }
    throw err;
  }
}
