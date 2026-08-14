import { cookies } from "next/headers";

import { isMarketplaceUxCompletionEnabled } from "./flags";
import type { BuyerOnboardingState } from "./types";

const ONBOARDING_COOKIE = "lot_buyer_onboarding_done";

export async function getBuyerOnboardingState(
  isAuthenticated: boolean,
): Promise<BuyerOnboardingState> {
  if (!isMarketplaceUxCompletionEnabled() || !isAuthenticated) {
    return { enabled: false, showWelcome: false };
  }

  const jar = await cookies();
  const done = jar.get(ONBOARDING_COOKIE)?.value === "1";
  return { enabled: true, showWelcome: !done };
}

export { ONBOARDING_COOKIE };
