import {
  createHttpAnalyticsAdapter,
  noopAnalyticsAdapter,
  type AnalyticsAdapter,
} from "@/lib/analytics/adapter";
import type { AnalyticsEventPayload } from "@/lib/analytics/events";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { getClientAttribution } from "@/lib/analytics/attribution-client";
import { isEmbeddedWebViewClient } from "@/lib/webview/detect";

let adapter: AnalyticsAdapter = createHttpAnalyticsAdapter();

/** Swap adapter in tests or when wiring a third-party provider. */
export function setAnalyticsAdapter(next: AnalyticsAdapter): void {
  adapter = next;
}

export function resetAnalyticsAdapter(): void {
  adapter = createHttpAnalyticsAdapter();
}

export function getAnalyticsAdapter(): AnalyticsAdapter {
  return adapter;
}

/** Fire-and-forget client event (no PII). */
export function trackEvent(payload: Omit<AnalyticsEventPayload, "webview">): void {
  if (typeof window === "undefined") return;
  const attribution = getClientAttribution();
  void adapter.track({
    ...payload,
    ...attribution,
    webview: isEmbeddedWebViewClient(),
  });
}

/** PDP/home CTA taps — entityId = action name (buy, add_to_cart, …). */
export function trackCtaClick(
  action: string,
  options?: { route?: string; entityId?: string },
): void {
  trackEvent({
    event: ANALYTICS_EVENTS.CTA_CLICK,
    route: options?.route,
    entityId: action,
  });
}

export { noopAnalyticsAdapter };
