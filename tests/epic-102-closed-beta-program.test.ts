import { describe, expect, it } from "vitest";

import {
  BETA_FEEDBACK_CATEGORIES,
  BUYER_JOURNEY_STEPS,
  SELLER_JOURNEY_STEPS,
} from "@/lib/product-operations/beta/types";
import { mapFeedbackCategory } from "@/lib/product-operations/feedback";
import { buildBetaEnvironmentInfo } from "@/lib/product-operations/beta/environment";

describe("EPIC-102 Closed Beta Program", () => {
  it("defines eight feedback categories", () => {
    expect(BETA_FEEDBACK_CATEGORIES).toHaveLength(8);
    expect(BETA_FEEDBACK_CATEGORIES).toContain("bug_report");
    expect(BETA_FEEDBACK_CATEGORIES).toContain("feature_request");
  });

  it("maps feedback categories to classifications", () => {
    expect(mapFeedbackCategory("bug_report")).toBe("error");
    expect(mapFeedbackCategory("confusing_ui")).toBe("ux");
    expect(mapFeedbackCategory("feature_request")).toBe("feature_request");
  });

  it("defines buyer and seller journey steps", () => {
    expect(BUYER_JOURNEY_STEPS.length).toBeGreaterThanOrEqual(8);
    expect(SELLER_JOURNEY_STEPS.length).toBeGreaterThanOrEqual(8);
    expect(BUYER_JOURNEY_STEPS[0]).toBe("boot");
    expect(SELLER_JOURNEY_STEPS).toContain("seller_wallet");
  });

  it("builds beta environment info", () => {
    const env = buildBetaEnvironmentInfo({
      channel: "CLOSED_BETA",
      appVersion: "0.1.2-alpha",
      buildNumber: 3,
    });
    expect(env.channel).toBe("CLOSED_BETA");
    expect(env.buildExpired).toBe(false);
  });

  it("detects expired builds", () => {
    const env = buildBetaEnvironmentInfo({
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
    expect(env.buildExpired).toBe(true);
    expect(env.environmentLabel).toBe("BETA_EXPIRED");
  });
});
