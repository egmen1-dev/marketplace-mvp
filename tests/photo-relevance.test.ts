import { describe, expect, it } from "vitest";

import {
  buildDirtySocksProductControl,
  evaluateProductQualityInput,
} from "@/lib/marketplace-content-quality";

describe("photo relevance critic", () => {
  it("marks irrelevant sock photos as blocker for fan product", async () => {
    const evaluation = await evaluateProductQualityInput(buildDirtySocksProductControl());
    const avgRelevance =
      evaluation.photo.images.reduce((s, i) => s + i.relevance, 0) /
      evaluation.photo.images.length;

    expect(avgRelevance).toBeLessThanOrEqual(10);
    expect(evaluation.failedGates).toContain("PRODUCT_IDENTITY_MISMATCH");
    expect(evaluation.blockers.some((b) => b.toLowerCase().includes("фото"))).toBe(true);
  });

  it("surfaces specific image evidence", async () => {
    const evaluation = await evaluateProductQualityInput(buildDirtySocksProductControl());
    const bad = evaluation.photo.images.find((i) => i.relevance < 30);
    expect(bad?.evidence.imageIndex).toBeGreaterThan(0);
    expect(bad?.url).toContain("socks");
  });
});
