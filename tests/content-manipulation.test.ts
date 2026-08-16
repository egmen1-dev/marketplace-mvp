import { describe, expect, it } from "vitest";

import {
  buildDescriptionSpamProduct,
  buildDirtySocksProductControl,
  evaluateProductQualityInput,
} from "@/lib/marketplace-content-quality";

describe("manipulation critic", () => {
  it("flags keyword stuffing", async () => {
    const evaluation = await evaluateProductQualityInput(buildDescriptionSpamProduct());
    expect(evaluation.manipulation.score).toBeLessThan(50);
    expect(evaluation.warnings.some((w) => w.toLowerCase().includes("keyword"))).toBe(true);
  });

  it("flags perfect text with irrelevant photos", async () => {
    const evaluation = await evaluateProductQualityInput(buildDirtySocksProductControl());
    expect(evaluation.manipulation.score).toBeLessThan(45);
    expect(evaluation.warnings.length).toBeGreaterThan(0);
  });
});
