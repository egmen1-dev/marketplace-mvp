import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isSellerBusinessIntelligenceEnabled } from "./flags";

export function trackSellerBusinessView(sellerProfileId: string): void {
  if (!isSellerBusinessIntelligenceEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_BUSINESS_VIEW,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: sellerProfileId,
  });
}

export function trackSellerAiSummaryView(sellerProfileId: string): void {
  if (!isSellerBusinessIntelligenceEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_AI_SUMMARY_VIEW,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: sellerProfileId,
  });
}

export function trackSellerNextActionView(input: {
  sellerProfileId: string;
  actionId: string;
}): void {
  if (!isSellerBusinessIntelligenceEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_NEXT_ACTION_VIEW,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: input.actionId,
  });
}

export function trackSellerActionClick(input: {
  sellerProfileId: string;
  actionId: string;
}): void {
  if (!isSellerBusinessIntelligenceEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_ACTION_CLICK,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: input.actionId,
  });
}

export function trackSellerProblemView(problemId: string): void {
  if (!isSellerBusinessIntelligenceEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_PROBLEM_VIEW,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: problemId,
  });
}

export function trackSellerMoneyExplanationView(sellerProfileId: string): void {
  if (!isSellerBusinessIntelligenceEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_MONEY_EXPLANATION_VIEW,
    route: ROUTES.ACCOUNT_BALANCE,
    entityId: sellerProfileId,
  });
}
