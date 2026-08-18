import { NextResponse } from "next/server";

import { ccosApiGuard } from "@/lib/ccos/api/guards";
import { resolveRequestUser } from "@/features/auth/resolve-request-user";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { CHECKOUT_STRATEGY, issueCheckoutHandoffToken } from "@/lib/mobile/checkout-handoff";
import { getCanonicalAppUrl } from "@/lib/env";

/**
 * Returns secure web checkout handoff URL for Mode A (Web Checkout Redirect).
 * Mobile opens handoffUrl in browser → web session → /checkout.
 */
export async function GET(request: Request) {
  const blocked = ccosApiGuard();
  if (blocked) return blocked;

  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const handoffToken = await issueCheckoutHandoffToken(user.id);
  const base = getCanonicalAppUrl().replace(/\/$/, "");
  const returnDeepLink = "lot://orders";
  const handoffUrl = `${base}/api/mobile/checkout/enter?token=${encodeURIComponent(handoffToken)}&return=${encodeURIComponent(returnDeepLink)}`;

  return NextResponse.json(
    withMobileApiContract(
      {
        strategy: CHECKOUT_STRATEGY,
        checkoutUrl: `${base}/checkout`,
        handoffUrl,
        returnDeepLink,
        expiresInSec: 300,
      },
      `checkout-handoff-${user.id.slice(0, 8)}`,
    ),
  );
}
