import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { resetContentQualityProviderCache } from "@/lib/marketplace-content-quality/provider-router";
import { RuleBasedFallbackProvider } from "@/lib/marketplace-content-quality/providers/rule-based-fallback";
import { buildFourQualityPhotosProduct } from "@/lib/marketplace-content-quality";

describe("content quality fallback", () => {
  const prevEnabled = process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED;
  const prevDaos = process.env.MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED;
  const prevUrl = process.env.DAOS_QUALITY_API_URL;

  beforeEach(() => {
    process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED = "true";
    process.env.MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED = "true";
    process.env.DAOS_QUALITY_API_URL = "";
    resetContentQualityProviderCache();
  });

  afterEach(() => {
    process.env.MARKETPLACE_CONTENT_QUALITY_ENABLED = prevEnabled;
    process.env.MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED = prevDaos;
    process.env.DAOS_QUALITY_API_URL = prevUrl;
    resetContentQualityProviderCache();
  });

  it("uses fallback when DAOS URL is missing", async () => {
    const provider = new RuleBasedFallbackProvider();
    const evaluation = await provider.evaluateProduct(buildFourQualityPhotosProduct());
    expect(evaluation.fallbackUsed).toBe(true);
    expect(evaluation.overallScore).toBeGreaterThan(0);
  });
});
