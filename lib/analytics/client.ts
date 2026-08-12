import {
  createHttpAnalyticsAdapter,
  noopAnalyticsAdapter,
  type AnalyticsAdapter,
} from "@/lib/analytics/adapter";
import type { AnalyticsEventPayload } from "@/lib/analytics/events";
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
  void adapter.track({
    ...payload,
    webview: isEmbeddedWebViewClient(),
  });
}

export { noopAnalyticsAdapter };
