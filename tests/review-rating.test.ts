import { describe, expect, it } from "vitest";

import { bayesianRating, ratingScore, REVIEW_RATING_PRIOR } from "@/lib/reviews/rating";

describe("bayesian review rating", () => {
  it("returns the global mean prior at zero reviews (neutral, not a penalty)", () => {
    expect(bayesianRating(0, 0)).toBeCloseTo(REVIEW_RATING_PRIOR.globalMean, 5);
    expect(ratingScore(0, 0)).toBeGreaterThan(0.5); // not destroyed
  });

  it("5.0 from 1 review does not beat 4.9 from 100 (section 39)", () => {
    const many = bayesianRating(4.9, 100);
    const few = bayesianRating(5.0, 1);
    expect(many).toBeGreaterThan(few);
  });

  it("converges to the raw average as count grows", () => {
    expect(bayesianRating(3.0, 5000)).toBeCloseTo(3.0, 1);
  });

  it("shrinks a low-count extreme toward the prior", () => {
    // 1.0 from 1 review should not be as low as 1.0.
    expect(bayesianRating(1.0, 1)).toBeGreaterThan(1.0);
    // 5.0 from 1 review should not be as high as 5.0.
    expect(bayesianRating(5.0, 1)).toBeLessThan(5.0);
  });

  it("ratingScore is normalized 0..1", () => {
    expect(ratingScore(5, 1000)).toBeLessThanOrEqual(1);
    expect(ratingScore(1, 1000)).toBeGreaterThanOrEqual(0);
  });
});
