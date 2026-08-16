import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  buildContradictoryAttributesProduct,
  buildDescriptionSpamProduct,
  buildDirtySocksProductControl,
  buildDuplicatePhotoProduct,
  buildFourQualityPhotosProduct,
  buildHighQuantityLowQualityProduct,
  buildVideoJunkProduct,
  CONTENT_QUALITY_BENCHMARK_SCENARIOS,
  evaluateProductQualityInput,
} from "@/lib/marketplace-content-quality";
import { RuleBasedFallbackProvider } from "@/lib/marketplace-content-quality/providers/rule-based-fallback";

describe("marketplace content quality", () => {
  it("evaluates commercial quality score with factor breakdown", async () => {
    const evaluation = await evaluateProductQualityInput(buildFourQualityPhotosProduct());
    expect(evaluation.overallScore).toBeGreaterThan(50);
    expect(evaluation.commercialQualityScore).toBe(evaluation.overallScore);
    expect(evaluation.photo.effectivePhotoCount).toBe(4);
    expect(evaluation.confidence).toBeGreaterThan(0);
    expect(evaluation.provider).toBeTruthy();
  });

  it("includes per-image evaluations", async () => {
    const evaluation = await evaluateProductQualityInput(buildFourQualityPhotosProduct());
    expect(evaluation.photo.images).toHaveLength(4);
    expect(evaluation.photo.images[0]?.isPrimary).toBe(true);
  });

  it("benchmark suite has curated scenarios", () => {
    expect(CONTENT_QUALITY_BENCHMARK_SCENARIOS.length).toBeGreaterThanOrEqual(7);
  });

  it("dirty socks control fails quality gate", async () => {
    const evaluation = await evaluateProductQualityInput(buildDirtySocksProductControl());
    expect(evaluation.qualityGateFailed).toBe(true);
    expect(evaluation.topEligibility).toBe("BLOCKED");
    expect(evaluation.failedGates).toContain("IRRELEVANT_CONTENT");
    expect(evaluation.photo.images.every((i) => i.relevance <= 10)).toBe(true);
  });

  it("duplicate photos reduce effectivePhotoCount", async () => {
    const evaluation = await evaluateProductQualityInput(buildDuplicatePhotoProduct());
    expect(evaluation.photo.uploadedPhotoCount).toBe(10);
    expect(evaluation.photo.effectivePhotoCount).toBeLessThanOrEqual(2);
  });

  it("description spam lowers quality scores", async () => {
    const evaluation = await evaluateProductQualityInput(buildDescriptionSpamProduct());
    expect(evaluation.description.score).toBeLessThan(35);
    expect(evaluation.seo.score).toBeLessThan(35);
    expect(evaluation.warnings.length + evaluation.manipulation.evidence.reasons.length).toBeGreaterThan(0);
  });

  it("junk video scores near zero", async () => {
    const evaluation = await evaluateProductQualityInput(buildVideoJunkProduct());
    expect(evaluation.video.score).toBeLessThanOrEqual(10);
  });

  it("volume conflict triggers consistency penalty", async () => {
    const evaluation = await evaluateProductQualityInput(buildContradictoryAttributesProduct());
    expect(evaluation.consistency.score).toBeLessThan(35);
  });

  it("four quality photos beat twenty low-quality photos", async () => {
    const bad = await evaluateProductQualityInput(buildHighQuantityLowQualityProduct());
    const good = await evaluateProductQualityInput(buildFourQualityPhotosProduct());
    expect(good.photo.score).toBeGreaterThan(bad.photo.score);
  });
});

describe("rule-based fallback provider", () => {
  const prev = process.env.MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED;

  beforeEach(() => {
    process.env.MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED = "false";
  });

  afterEach(() => {
    process.env.MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED = prev;
  });

  it("works without DAOS", async () => {
    const provider = new RuleBasedFallbackProvider();
    const evaluation = await provider.evaluateProduct(buildFourQualityPhotosProduct());
    expect(evaluation.fallbackUsed).toBe(true);
    expect(evaluation.daosUsed).toBe(false);
  });
});
