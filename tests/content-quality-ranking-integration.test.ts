import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  runDirtySocksControlTest,
  runHighQuantityVsQualityTest,
  runQualityRankingCriticalTest,
} from "@/lib/marketplace-content-quality";
import { resetContentQualityProviderCache } from "@/lib/marketplace-content-quality/provider-router";

describe("content quality ranking integration", () => {
  const prev = process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED;

  beforeEach(() => {
    process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED = "true";
    resetContentQualityProviderCache();
  });

  afterEach(() => {
    process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED = prev;
    resetContentQualityProviderCache();
  });

  it("dirty socks control blocks TOP eligibility", async () => {
    const result = await runDirtySocksControlTest();
    expect(result.photoRelevance).toBeLessThanOrEqual(10);
    expect(result.topBlocked).toBe(true);
    expect(result.qualityGateFailed).toBe(true);
  });

  it("quality beats quantity in photo scoring", async () => {
    const result = await runHighQuantityVsQualityTest();
    expect(result.goodWins).toBe(true);
    expect(result.badEffectiveCount).toBeLessThanOrEqual(2);
  });

  it("critical assertion: promoted junk must not outrank quality card", async () => {
    const result = await runQualityRankingCriticalTest();
    expect(result.verdict).toBe("PASS");
    expect(result.productAGated).toBe(true);
    expect(result.productBPosition).toBeLessThan(result.productAPosition);
  });
});
