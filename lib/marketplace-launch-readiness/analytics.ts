import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isMarketplaceLaunchReadinessEnabled } from "./flags";

export function trackLaunchAuditStarted(): void {
  if (!isMarketplaceLaunchReadinessEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.LAUNCH_AUDIT_STARTED,
    route: ROUTES.ADMIN_LAUNCH,
  });
}

export function trackLaunchCheckPassed(checkId: string): void {
  if (!isMarketplaceLaunchReadinessEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.LAUNCH_CHECK_PASSED,
    route: ROUTES.ADMIN_LAUNCH,
    entityId: checkId,
  });
}

export function trackLaunchCheckFailed(checkId: string): void {
  if (!isMarketplaceLaunchReadinessEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.LAUNCH_CHECK_FAILED,
    route: ROUTES.ADMIN_LAUNCH,
    entityId: checkId,
  });
}

export function trackProductionHealthView(): void {
  if (!isMarketplaceLaunchReadinessEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.PRODUCTION_HEALTH_VIEW,
    route: ROUTES.ADMIN_HEALTH,
  });
}
