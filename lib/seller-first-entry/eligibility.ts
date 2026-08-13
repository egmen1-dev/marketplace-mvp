import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import { isFirstEntryComplete, resolveFirstEntryStep } from "./progress";
import type { SellerExperienceProgressDto } from "./types";

/** Experienced seller — skip welcome onboarding. */
export function isExperiencedSeller(signals: SellerProgressSignals): boolean {
  if (signals.completedPayouts > 0 || signals.paidAmount > 0) return true;
  if (signals.ordersCount >= 3 && signals.activeProducts >= 2) return true;
  return false;
}

export function shouldShowWelcomeScreen(input: {
  signals: SellerProgressSignals;
  experience: SellerExperienceProgressDto | null;
}): boolean {
  if (isExperiencedSeller(input.signals)) return false;
  if (input.experience?.completedAt) return false;
  if (input.experience?.dismissedAt && isFirstEntryComplete(resolveFirstEntryStep(input.signals))) {
    return false;
  }
  return (
    input.signals.totalProducts === 0 ||
    (input.signals.activeProducts === 0 && input.signals.ordersCount === 0)
  );
}

export function shouldShowNextStepBanner(input: {
  signals: SellerProgressSignals;
  experience: SellerExperienceProgressDto | null;
}): boolean {
  if (isExperiencedSeller(input.signals)) return false;
  if (input.experience?.completedAt) return false;
  const step = resolveFirstEntryStep(input.signals);
  return !isFirstEntryComplete(step);
}

export function shouldRedirectToSellerStart(input: {
  signals: SellerProgressSignals;
  experience: SellerExperienceProgressDto | null;
  pathname: string;
}): boolean {
  if (input.pathname === "/account/seller-start") return false;
  if (!shouldShowWelcomeScreen(input)) return false;
  if (!input.experience?.startedAt) return true;
  return false;
}
