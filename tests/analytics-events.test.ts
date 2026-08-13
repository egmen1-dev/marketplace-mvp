import { describe, expect, it } from "vitest";

import {
  ANALYTICS_EVENTS,
  ANALYTICS_EVENT_NAMES,
  MEASUREMENT_FUNNEL,
  isAnalyticsEventName,
} from "@/lib/analytics/events";

describe("analytics events", () => {
  it("defines all funnel events", () => {
    expect(ANALYTICS_EVENT_NAMES).toContain("page_view");
    expect(ANALYTICS_EVENT_NAMES).toContain("landing_view");
    expect(ANALYTICS_EVENT_NAMES).toContain("purchase_complete");
    expect(ANALYTICS_EVENT_NAMES).toContain("ad_landing_view");
    expect(ANALYTICS_EVENT_NAMES.length).toBe(26);
    expect(ANALYTICS_EVENT_NAMES).toContain("pdp_section_view");
    expect(ANALYTICS_EVENT_NAMES).toContain("buy_intent");
    expect(ANALYTICS_EVENT_NAMES).toContain("seller_block_view");
    expect(ANALYTICS_EVENT_NAMES).toContain("characteristics_expand");
    expect(ANALYTICS_EVENT_NAMES).toContain("delivery_view");
    expect(ANALYTICS_EVENT_NAMES).toContain("hero_product_click");
    expect(ANALYTICS_EVENT_NAMES).toContain("search_start");
    expect(ANALYTICS_EVENT_NAMES).toContain("buyer_confirmation");
    expect(ANALYTICS_EVENT_NAMES).toContain("dispute_created");
    expect(ANALYTICS_EVENT_NAMES).toContain("dispute_resolved");
    expect(ANALYTICS_EVENT_NAMES).toContain("seller_trust_view");
    expect(ANALYTICS_EVENT_NAMES).toContain("trust_block_view");
  });

  it("validates event names", () => {
    expect(isAnalyticsEventName(ANALYTICS_EVENTS.ADD_TO_CART)).toBe(true);
    expect(isAnalyticsEventName("not_an_event")).toBe(false);
  });

  it("defines measurement funnel with traffic step", () => {
    expect(MEASUREMENT_FUNNEL[0]?.event).toBe("page_view");
    expect(MEASUREMENT_FUNNEL.at(-1)?.event).toBe("purchase_complete");
    expect(MEASUREMENT_FUNNEL).toHaveLength(7);
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

  it("accepts attribution fields", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const res = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "landing_view",
          route: "/",
          visitorId: "test-visitor-uuid",
          utmSource: "vk",
          utmMedium: "cpc",
          utmCampaign: "test",
          webview: true,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("accepts ad_landing_view", async () => {
    const { POST } = await import("@/app/api/analytics/events/route");
    const res = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "ad_landing_view",
          route: "/",
          visitorId: "test-visitor",
          utmSource: "vk",
          utmMedium: "cpc",
          utmCampaign: "acceptance",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});
