import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isSellerJourneyEnabled } from "./flags";
import type { SellerJourneyStep } from "./types";

export function trackSellerJourneyView(sellerProfileId: string): void {
  if (!isSellerJourneyEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_JOURNEY_VIEW,
    route: ROUTES.ACCOUNT_GROWTH,
    entityId: sellerProfileId,
  });
}

export function trackSellerStepView(input: {
  sellerProfileId: string;
  step: SellerJourneyStep;
}): void {
  if (!isSellerJourneyEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_STEP_VIEW,
    route: ROUTES.ACCOUNT_GROWTH,
    entityId: input.step,
  });
}

export function trackSellerNextActionClick(input: {
  sellerProfileId: string;
  step: SellerJourneyStep;
}): void {
  if (!isSellerJourneyEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_NEXT_ACTION_CLICK,
    route: ROUTES.ACCOUNT_GROWTH,
    entityId: input.step,
  });
}

export function trackSellerMilestoneReached(input: {
  sellerProfileId: string;
  milestone: string;
}): void {
  if (!isSellerJourneyEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_MILESTONE_REACHED,
    route: ROUTES.ACCOUNT_GROWTH,
    entityId: input.milestone,
  });
}

export function trackSellerFirstOrder(sellerProfileId: string): void {
  if (!isSellerJourneyEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_FIRST_SALE,
    route: ROUTES.ACCOUNT_SALES,
    entityId: sellerProfileId,
  });
}

export function trackSellerFirstPayout(sellerProfileId: string): void {
  if (!isSellerJourneyEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_FIRST_PAYOUT,
    route: ROUTES.ACCOUNT_PAYOUTS,
    entityId: sellerProfileId,
  });
}
