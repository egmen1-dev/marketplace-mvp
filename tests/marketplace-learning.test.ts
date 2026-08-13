import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  acceptRecommendationAction,
  completeRecommendationAction,
} from "@/lib/marketplace-learning/actions";
import {
  createLearningExperiment,
  listExperiments,
  updateExperimentStatus,
} from "@/lib/marketplace-learning/experiments";
import { isMarketplaceLearningEnabled } from "@/lib/marketplace-learning/flags";
import { metricSnapshot } from "@/lib/marketplace-learning/learning-signals";
import {
  evaluateOutcome,
  finalizeExperimentOutcome,
} from "@/lib/marketplace-learning/outcomes";
import {
  listPatterns,
  patternFromOutcome,
  seedDefaultPatterns,
} from "@/lib/marketplace-learning/patterns";
import { computeRecommendationQualityScore } from "@/lib/marketplace-learning/recommendations";
import {
  assertMarketplaceLearningAdminAccess,
  MarketplaceLearningForbiddenError,
} from "@/lib/marketplace-learning/permissions";
import { resetLearningStoreForTests } from "@/lib/marketplace-learning/store";

const PREV_FLAG = process.env.MARKETPLACE_LEARNING_ENABLED;

const baseline = metricSnapshot({ views: 100, cart: 10, orders: 2 });

describe("learning experiment lifecycle", () => {
  beforeEach(() => {
    resetLearningStoreForTests();
    process.env.MARKETPLACE_LEARNING_ENABLED = "true";
  });

  afterEach(() => {
    if (PREV_FLAG === undefined) delete process.env.MARKETPLACE_LEARNING_ENABLED;
    else process.env.MARKETPLACE_LEARNING_ENABLED = PREV_FLAG;
  });

  it("creates RUNNING experiment with baseline", () => {
    const experiment = createLearningExperiment({
      sellerProfileId: "seller_1",
      entityType: "PRODUCT",
      entityId: "prod_1",
      source: "GROWTH_SCORE",
      recommendation: "Добавьте фото к товару",
      reason: "Мало конверсии",
      baseline,
    });
    expect(experiment.status).toBe("RUNNING");
    expect(experiment.baseline.views).toBe(100);
  });

  it("tracks action start and completion", () => {
    const experiment = createLearningExperiment({
      sellerProfileId: "seller_1",
      entityType: "PRODUCT",
      entityId: "prod_1",
      source: "AI_CENTER",
      recommendation: "Добавьте фото",
      reason: "Test",
      baseline,
    });
    acceptRecommendationAction({
      experimentId: experiment.id,
      recommendation: experiment.recommendation,
    });
    completeRecommendationAction(experiment.id);
    const updated = listExperiments()[0];
    expect(updated?.recommendationAccepted).toBe(true);
    expect(updated?.actionCompletedAt).toBeTruthy();
  });

  it("transitions to SUCCESS on positive outcome", () => {
    const experiment = createLearningExperiment({
      sellerProfileId: "seller_1",
      entityType: "PRODUCT",
      entityId: "prod_1",
      source: "QUALITY_SCORE",
      recommendation: "Добавьте характеристики",
      reason: "Test",
      baseline,
    });
    acceptRecommendationAction({
      experimentId: experiment.id,
      recommendation: experiment.recommendation,
    });
    completeRecommendationAction(experiment.id);

    const current = metricSnapshot({ views: 120, cart: 18, orders: 4 });
    const outcome = finalizeExperimentOutcome({
      experimentId: experiment.id,
      baseline,
      current,
      actionCompleted: true,
    });
    expect(outcome.verdict).toBe("POSITIVE");
    expect(listExperiments()[0]?.status).toBe("SUCCESS");
  });
});

describe("outcome calculation", () => {
  it("marks negative when orders drop", () => {
    const outcome = evaluateOutcome({
      experimentId: "exp_test",
      baseline,
      current: metricSnapshot({ views: 100, cart: 5, orders: 0 }),
      actionCompleted: true,
    });
    expect(outcome.verdict).toBe("NEGATIVE");
  });
});

describe("pattern creation", () => {
  beforeEach(() => resetLearningStoreForTests());

  it("seeds default marketplace patterns", () => {
    seedDefaultPatterns();
    expect(listPatterns().length).toBeGreaterThan(0);
  });

  it("creates pattern from positive outcome", () => {
    const experiment = createLearningExperiment({
      sellerProfileId: "seller_1",
      entityType: "PRODUCT",
      entityId: "prod_1",
      source: "GROWTH_SCORE",
      recommendation: "Добавьте фото",
      reason: "Test",
      baseline,
    });
    const outcome = evaluateOutcome({
      experimentId: experiment.id,
      baseline,
      current: metricSnapshot({ views: 150, cart: 20, orders: 5 }),
      actionCompleted: true,
    });
    const pattern = patternFromOutcome({ experiment, outcome });
    expect(pattern?.statement).toContain("Добавьте фото");
  });
});

describe("recommendation quality score", () => {
  beforeEach(() => resetLearningStoreForTests());

  it("returns score 0-100", () => {
    const score = computeRecommendationQualityScore();
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.factors.length).toBe(4);
  });
});

describe("permissions", () => {
  it("allows admin learning center", () => {
    expect(() => assertMarketplaceLearningAdminAccess("ADMIN")).not.toThrow();
  });

  it("blocks non-admin", () => {
    expect(() => assertMarketplaceLearningAdminAccess("BUYER")).toThrow(
      MarketplaceLearningForbiddenError,
    );
  });
});

describe("MARKETPLACE_LEARNING_ENABLED flag", () => {
  beforeEach(() => {
    process.env.MARKETPLACE_LEARNING_ENABLED = "true";
  });

  afterEach(() => {
    if (PREV_FLAG === undefined) delete process.env.MARKETPLACE_LEARNING_ENABLED;
    else process.env.MARKETPLACE_LEARNING_ENABLED = PREV_FLAG;
  });

  it("is on when env true", () => {
    expect(isMarketplaceLearningEnabled()).toBe(true);
  });
});

describe("experiment status updates", () => {
  beforeEach(() => resetLearningStoreForTests());

  it("sets endedAt on terminal status", () => {
    const experiment = createLearningExperiment({
      sellerProfileId: "seller_1",
      entityType: "SELLER",
      entityId: "seller_1",
      source: "AI_CENTER",
      recommendation: "Test",
      reason: "Test",
      baseline,
    });
    const updated = updateExperimentStatus(experiment.id, "INCONCLUSIVE");
    expect(updated?.endedAt).toBeTruthy();
  });
});
