import type { AnalyticsEventName } from "@/lib/analytics/events";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type TrackServerEventInput = {
  event: AnalyticsEventName;
  route?: string;
  entityId?: string;
  webview?: boolean;
};

/** Persist conversion event — failures are logged, never thrown to caller. */
export async function trackServerEvent(
  input: TrackServerEventInput,
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event: input.event,
        route: input.route?.slice(0, 200) ?? null,
        entityId: input.entityId?.slice(0, 100) ?? null,
        webview: input.webview ?? false,
      },
    });
    log.info(input.event, {
      route: input.route,
      entityId: input.entityId,
      webview: input.webview ?? false,
    });
  } catch (err) {
    log.error("analytics_track_failed", {
      event: input.event,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
