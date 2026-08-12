import type { AnalyticsEventPayload } from "@/lib/analytics/events";

/** Provider-agnostic analytics sink — wire gtag/Plausible/PostHog later. */
export type AnalyticsAdapter = {
  track: (payload: AnalyticsEventPayload) => void | Promise<void>;
};

export const noopAnalyticsAdapter: AnalyticsAdapter = {
  track() {
    /* intentionally empty */
  },
};

type HttpAdapterOptions = {
  endpoint?: string;
};

/** Default client adapter — POST to our API (persisted server-side). */
export function createHttpAnalyticsAdapter(
  options: HttpAdapterOptions = {},
): AnalyticsAdapter {
  const endpoint = options.endpoint ?? "/api/analytics/events";

  return {
    track(payload) {
      if (typeof window === "undefined") return;
      const body = JSON.stringify(payload);
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        /* analytics must not break UX */
      });
    },
  };
}
