import type { AnalyticsEventName } from "@/lib/analytics/events";
import type { AnalyticsAttribution } from "@/lib/analytics/attribution";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type TrackServerEventInput = {
  event: AnalyticsEventName;
  route?: string;
  entityId?: string;
  webview?: boolean;
} & AnalyticsAttribution;

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
        visitorId: input.visitorId?.slice(0, 64) ?? null,
        utmSource: input.utmSource?.slice(0, 100) ?? null,
        utmMedium: input.utmMedium?.slice(0, 100) ?? null,
        utmCampaign: input.utmCampaign?.slice(0, 100) ?? null,
        utmContent: input.utmContent?.slice(0, 100) ?? null,
      },
    });
    log.info(input.event, {
      route: input.route,
      entityId: input.entityId,
      webview: input.webview ?? false,
      visitorId: input.visitorId ? "[set]" : undefined,
      utmSource: input.utmSource,
    });
  } catch (err) {
    log.error("analytics_track_failed", {
      event: input.event,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
