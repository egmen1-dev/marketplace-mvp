import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveRequestUser } from "@/features/auth/resolve-request-user";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { issueSessionHandoffToken } from "@/lib/mobile/session-handoff";
import { getCanonicalAppUrl } from "@/lib/env";
import { ROUTES } from "@/lib/constants";

const ALLOWED_DESTINATIONS = new Set<string>([
  ROUTES.ACCOUNT_SELLER_START,
  ROUTES.SELLER_NEW_PRODUCT,
  ROUTES.SELLER_ORDERS,
  ROUTES.ACCOUNT_MESSAGES,
]);

/**
 * Returns secure web handoff URL for seller onboarding / product create on web.
 */
export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dest = searchParams.get("dest") ?? ROUTES.ACCOUNT_SELLER_START;
  if (!ALLOWED_DESTINATIONS.has(dest)) {
    return NextResponse.json({ error: "Недопустимый маршрут" }, { status: 400 });
  }

  const handoffToken = await issueSessionHandoffToken(user.id, dest);
  const base = getCanonicalAppUrl().replace(/\/$/, "");
  const returnDeepLink = "lot://sell";
  const handoffUrl = `${base}/api/mobile/web-handoff/enter?token=${encodeURIComponent(handoffToken)}&return=${encodeURIComponent(returnDeepLink)}`;

  return NextResponse.json(
    withMobileApiContract(
      {
        handoffUrl,
        destination: dest,
        returnDeepLink,
        expiresInSec: 300,
      },
      `web-handoff-${user.id.slice(0, 8)}`,
    ),
  );
}
