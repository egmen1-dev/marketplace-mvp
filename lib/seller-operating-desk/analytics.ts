import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isSellerOperatingDeskEnabled } from "./flags";

export function trackSellerOperatingDeskView(sellerProfileId: string): void {
  if (!isSellerOperatingDeskEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_OPERATING_DESK_VIEW,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: sellerProfileId,
  });
}

export function trackSellerOperatingDeskIssueClick(input: {
  sellerProfileId: string;
  issueId: string;
}): void {
  if (!isSellerOperatingDeskEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_OPERATING_DESK_ISSUE_CLICK,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: input.issueId,
  });
}

export function trackSellerOperatingDeskActionClick(input: {
  sellerProfileId: string;
  actionId: string;
}): void {
  if (!isSellerOperatingDeskEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_OPERATING_DESK_ACTION_CLICK,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: input.actionId,
  });
}
