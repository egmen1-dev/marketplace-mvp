import { describe, expect, it } from "vitest";

import { CLOSED_BETA_PROMOTION_STACK } from "@/lib/release/promotion/config";
import { PromotionPlanner } from "@/lib/release/promotion/planner";

describe("EPIC-110 promotion planner", () => {
  it("defines closed beta PR stack in order", () => {
    expect(CLOSED_BETA_PROMOTION_STACK.length).toBeGreaterThanOrEqual(8);
    expect(CLOSED_BETA_PROMOTION_STACK[0].pr).toBe(124);
    expect(CLOSED_BETA_PROMOTION_STACK.at(-1)?.pr).toBe(131);
  });

  it("plans stack report structure", () => {
    const planner = new PromotionPlanner();
    const report = planner.plan();
    expect(report.stack.length).toBe(CLOSED_BETA_PROMOTION_STACK.length);
    expect(report.verdict).toBeDefined();
  });
});
