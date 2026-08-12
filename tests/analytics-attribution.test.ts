import { describe, expect, it } from "vitest";

import {
  cookieMaxAgeSec,
  parseUtmCookie,
  parseUtmFromSearch,
  serializeUtmCookie,
} from "@/lib/analytics/attribution";
import { buildFunnelStepMetrics, pctRate } from "@/lib/analytics/funnel-metrics";
import { MEASUREMENT_FUNNEL } from "@/lib/analytics/events";

describe("UTM attribution", () => {
  it("parses utm params from search string", () => {
    const utm = parseUtmFromSearch(
      "?utm_source=vk&utm_medium=cpc&utm_campaign=spring&utm_content=banner1",
    );
    expect(utm).toEqual({
      utmSource: "vk",
      utmMedium: "cpc",
      utmCampaign: "spring",
      utmContent: "banner1",
    });
  });

  it("returns null when no utm params", () => {
    expect(parseUtmFromSearch("?ref=home")).toBeNull();
  });

  it("round-trips utm cookie", () => {
    const raw = serializeUtmCookie({ utmSource: "vk", utmMedium: "cpc" });
    expect(parseUtmCookie(raw)).toEqual({ utmSource: "vk", utmMedium: "cpc" });
  });

  it("cookie max age is 30 days", () => {
    expect(cookieMaxAgeSec()).toBe(30 * 24 * 60 * 60);
  });
});

describe("funnel metrics", () => {
  it("computes conversion and drop-off", () => {
    const counts = {
      page_view: 100,
      landing_view: 95,
      category_view: 40,
      product_view: 20,
      add_to_cart: 8,
      checkout_start: 3,
      purchase_complete: 1,
    };
    const uniques = {
      page_view: 50,
      landing_view: 48,
      category_view: 30,
      product_view: 18,
      add_to_cart: 7,
      checkout_start: 3,
      purchase_complete: 1,
    };

    const steps = buildFunnelStepMetrics(MEASUREMENT_FUNNEL, counts, uniques);
    expect(steps).toHaveLength(7);
    expect(steps[0]?.label).toBe("Traffic");
    expect(steps[1]?.conversionFromPrevious).toBe(96);
    expect(steps[2]?.dropOff).toBe(18);
    expect(steps[6]?.conversionFromTraffic).toBe(2);
  });

  it("pctRate handles zero denominator", () => {
    expect(pctRate(5, 0)).toBeNull();
    expect(pctRate(1, 4)).toBe(25);
  });
});
