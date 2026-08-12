import { describe, expect, it } from "vitest";

import {
  ANALYTICS_EVENTS,
  ANALYTICS_EVENT_NAMES,
  isAnalyticsEventName,
} from "@/lib/analytics/events";

describe("analytics events", () => {
  it("defines all funnel events", () => {
    expect(ANALYTICS_EVENT_NAMES).toContain("page_view");
    expect(ANALYTICS_EVENT_NAMES).toContain("landing_view");
    expect(ANALYTICS_EVENT_NAMES).toContain("purchase_complete");
    expect(ANALYTICS_EVENT_NAMES.length).toBe(8);
  });

  it("validates event names", () => {
    expect(isAnalyticsEventName(ANALYTICS_EVENTS.ADD_TO_CART)).toBe(true);
    expect(isAnalyticsEventName("not_an_event")).toBe(false);
  });
});

describe("analytics API schema", () => {
  it("rejects unknown events", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const res = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "buy_now", route: "/" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
