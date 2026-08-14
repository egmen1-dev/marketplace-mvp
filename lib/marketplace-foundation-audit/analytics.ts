import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isMarketplaceFoundationAuditEnabled } from "./flags";

export function trackFoundationAuditView(adminUserId: string): void {
  if (!isMarketplaceFoundationAuditEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.FOUNDATION_AUDIT_VIEW,
    route: ROUTES.ADMIN_FOUNDATION,
    entityId: adminUserId,
  });
}

export function trackFoundationIssueDetected(issueId: string): void {
  if (!isMarketplaceFoundationAuditEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.FOUNDATION_ISSUE_DETECTED,
    route: ROUTES.ADMIN_FOUNDATION,
    entityId: issueId,
  });
}

export function trackBuyerFlowCheck(): void {
  if (!isMarketplaceFoundationAuditEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.BUYER_FLOW_CHECK,
    route: ROUTES.ADMIN_FOUNDATION,
  });
}

export function trackSellerFlowCheck(): void {
  if (!isMarketplaceFoundationAuditEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_FLOW_CHECK,
    route: ROUTES.ADMIN_FOUNDATION,
  });
}

export function trackOrderFlowCheck(): void {
  if (!isMarketplaceFoundationAuditEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.ORDER_FLOW_CHECK,
    route: ROUTES.ADMIN_FOUNDATION,
  });
}

export function trackPaymentCheck(): void {
  if (!isMarketplaceFoundationAuditEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.PAYMENT_CHECK,
    route: ROUTES.ADMIN_FOUNDATION,
  });
}
