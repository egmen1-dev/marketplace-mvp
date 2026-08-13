import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isSellerOperationsEnabled } from "./flags";

export function trackSellerOperationsView(sellerProfileId: string): void {
  if (!isSellerOperationsEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_OPERATIONS_VIEW,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: sellerProfileId,
  });
}

export function trackSellerTaskOpen(input: {
  sellerProfileId: string;
  taskId: string;
}): void {
  if (!isSellerOperationsEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_TASK_OPEN,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: input.taskId,
  });
}

export function trackSellerPriorityClick(input: {
  sellerProfileId: string;
  priorityId: string;
}): void {
  if (!isSellerOperationsEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_PRIORITY_CLICK,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: input.priorityId,
  });
}

export function trackSellerAiAdviceClick(sellerProfileId: string): void {
  if (!isSellerOperationsEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SELLER_AI_ADVICE_CLICK,
    route: ROUTES.ACCOUNT_BUSINESS,
    entityId: sellerProfileId,
  });
}
