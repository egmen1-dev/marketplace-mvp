import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isSellerFirstEntryEnabled } from "./flags";
import type { SellerFirstEntryStep } from "./types";

export function trackSellerEntryStarted(sellerProfileId: string): void {
  if (!isSellerFirstEntryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_ENTRY_STARTED,
    route: ROUTES.ACCOUNT_SELLER_START,
    entityId: sellerProfileId,
  });
}

export function trackSellerOnboardingStarted(sellerProfileId: string): void {
  if (!isSellerFirstEntryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_ONBOARDING_STARTED,
    route: ROUTES.ACCOUNT_SELLER_START,
    entityId: sellerProfileId,
  });
}

export function trackSellerOnboardingStepCompleted(input: {
  sellerProfileId: string;
  step: SellerFirstEntryStep;
}): void {
  if (!isSellerFirstEntryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_ONBOARDING_STEP_COMPLETED,
    route: ROUTES.ACCOUNT_SELLER_START,
    entityId: input.step,
  });
}

export function trackSellerOnboardingCompleted(sellerProfileId: string): void {
  if (!isSellerFirstEntryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_ONBOARDING_COMPLETED,
    route: ROUTES.ACCOUNT_SELLER_START,
    entityId: sellerProfileId,
  });
}

export function trackSellerGuideActionClick(input: {
  sellerProfileId: string;
  step: SellerFirstEntryStep;
}): void {
  if (!isSellerFirstEntryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_GUIDE_ACTION_CLICK,
    route: ROUTES.ACCOUNT_SELLER_START,
    entityId: input.step,
  });
}
