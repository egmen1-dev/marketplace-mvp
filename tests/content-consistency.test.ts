import { describe, expect, it } from "vitest";

import {
  buildContradictoryAttributesProduct,
  evaluateProductQualityInput,
} from "@/lib/marketplace-content-quality";

describe("text-image consistency critic", () => {
  it("penalizes conflicting volume between title, description and attributes", async () => {
    const evaluation = await evaluateProductQualityInput(buildContradictoryAttributesProduct());
    expect(evaluation.consistency.score).toBeLessThan(30);
    expect(evaluation.consistency.evidence.reasons.some((r) => r.includes("16"))).toBe(true);
  });
});
