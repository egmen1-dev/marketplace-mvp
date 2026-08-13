import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isSellerLifecycleEnabled } from "./flags";
import type { SellerLifecycleStage, SellerMilestoneType } from "./types";

export function trackSellerJourneyView(): void {
  if (!isSellerLifecycleEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_JOURNEY_VIEW,
    route: ROUTES.ACCOUNT_COMMAND_CENTER,
  });
}

export function trackSellerMilestoneReached(input: {
  milestone: SellerMilestoneType;
  sellerProfileId: string;
}): void {
  if (!isSellerLifecycleEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_MILESTONE_REACHED,
    route: ROUTES.ACCOUNT_COMMAND_CENTER,
    entityId: input.sellerProfileId,
  });
}

export function trackSellerNextStepClick(input: {
  stepId: string;
  sellerProfileId: string;
}): void {
  if (!isSellerLifecycleEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_NEXT_STEP_CLICK,
    route: ROUTES.ACCOUNT_COMMAND_CENTER,
    entityId: input.stepId,
  });
}

export function trackSellerActivationCompleted(sellerProfileId: string): void {
  if (!isSellerLifecycleEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_ACTIVATION_COMPLETED,
    route: ROUTES.ACCOUNT,
    entityId: sellerProfileId,
  });
}

export function trackSellerFirstSale(sellerProfileId: string): void {
  if (!isSellerLifecycleEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_FIRST_SALE,
    route: ROUTES.ACCOUNT_SALES,
    entityId: sellerProfileId,
  });
}

export function trackSellerFirstPayout(sellerProfileId: string): void {
  if (!isSellerLifecycleEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_FIRST_PAYOUT,
    route: ROUTES.ACCOUNT_PAYOUTS,
    entityId: sellerProfileId,
  });
}

export function trackLifecycleStageTransition(input: {
  stage: SellerLifecycleStage;
  sellerProfileId: string;
}): void {
  if (!isSellerLifecycleEnabled()) return;
  if (input.stage === "FIRST_ORDER") {
    trackSellerFirstSale(input.sellerProfileId);
  }
  if (input.stage === "FIRST_PAYOUT") {
    trackSellerFirstPayout(input.sellerProfileId);
  }
  if (input.stage === "SELLER_ACTIVATED") {
    trackSellerActivationCompleted(input.sellerProfileId);
  }
}
