import { describe, expect, it } from "vitest";

import {
  calcPrepaymentAmount,
  isAllowedPrepaymentPercent,
  PREPAYMENT_PERCENTS,
} from "@/features/pickup/lib/prepayment";

describe("calcPrepaymentAmount", () => {
  it("computes 20% of 10000 as 2000 / 8000", () => {
    expect(calcPrepaymentAmount(10_000, 20)).toEqual({
      prepayment: 2000,
      remaining: 8000,
    });
  });

  it("handles 0% and 100%", () => {
    expect(calcPrepaymentAmount(10_000, 0)).toEqual({
      prepayment: 0,
      remaining: 10_000,
    });
    expect(calcPrepaymentAmount(10_000, 100)).toEqual({
      prepayment: 10_000,
      remaining: 0,
    });
  });

  it("rounds to 2 decimals", () => {
    expect(calcPrepaymentAmount(99.99, 30)).toEqual({
      prepayment: 30,
      remaining: 69.99,
    });
  });
});

describe("isAllowedPrepaymentPercent", () => {
  it("allows only configured percents", () => {
    for (const p of PREPAYMENT_PERCENTS) {
      expect(isAllowedPrepaymentPercent(p)).toBe(true);
    }
    expect(isAllowedPrepaymentPercent(15)).toBe(false);
    expect(isAllowedPrepaymentPercent(-1)).toBe(false);
  });
});
