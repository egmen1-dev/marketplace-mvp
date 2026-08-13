import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { buildMarketplaceActionPlans } from "@/lib/marketplace-operator/action-plans";
import { generateMarketplaceDiagnosis } from "@/lib/marketplace-operator/diagnosis";
import { calculateImpactScore } from "@/lib/marketplace-operator/impact";
import {
  assertMarketplaceOperatorAccess,
  MarketplaceOperatorForbiddenError,
} from "@/lib/marketplace-operator/queries";
import { generateGrowthStrategy } from "@/lib/marketplace-operator/strategy";
import { IMPACT_WEIGHTS } from "@/lib/marketplace-operator/types";
import type { MarketplaceSignal } from "@/lib/marketplace-intelligence/types";

const PREV_FLAG = process.env.MARKETPLACE_OPERATOR_ENABLED;

const sampleSignals: MarketplaceSignal[] = [
  {
    type: "PRODUCT_GAP",
    category: "Электроинструмент",
    severity: "HIGH",
    message: "Высокий спрос, мало предложений",
    metric: 120,
    source: "buyer_demand_vs_supply",
  },
  {
    type: "REVENUE_OPPORTUNITY",
    category: null,
    severity: "HIGH",
    message: "500 товаров имеют просмотры, но 0 продаж",
    metric: 500,
    source: "conversion.views_no_sales",
  },
];

describe("generateMarketplaceDiagnosis", () => {
  it("creates structured diagnosis with causes", () => {
    const diagnoses = generateMarketplaceDiagnosis({
      signals: sampleSignals,
      problems: [],
    });
    expect(diagnoses.length).toBeGreaterThan(0);
    expect(diagnoses[0].causes.length).toBeGreaterThan(0);
    expect(diagnoses[0].impact.length).toBeGreaterThan(0);
    expect(["Demand", "Supply", "Conversion", "Revenue"]).toContain(
      diagnoses[0].category,
    );
  });
});

describe("generateGrowthStrategy", () => {
  it("builds multi-week plan", () => {
    const diagnoses = generateMarketplaceDiagnosis({
      signals: sampleSignals,
      problems: [],
    });
    const strategies = generateGrowthStrategy(diagnoses);
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies[0].weeks).toHaveLength(4);
    expect(strategies[0].weeks[0].tasks.length).toBeGreaterThan(0);
  });
});

describe("ImpactScore", () => {
  it("weights sum to 100", () => {
    const total = Object.values(IMPACT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("returns advisory score without money promise", () => {
    const diagnoses = generateMarketplaceDiagnosis({
      signals: sampleSignals,
      problems: [],
    });
    const impact = calculateImpactScore({
      diagnosis: diagnoses[0],
      actionCount: 3,
    });
    expect(impact.impactScore).toBeGreaterThan(0);
    expect(impact.impactScore).toBeLessThanOrEqual(100);
    expect(impact.expectedEffect).not.toMatch(/₽|руб/i);
  });
});

describe("Action plans", () => {
  it("maps diagnosis to executable actions", () => {
    const diagnoses = generateMarketplaceDiagnosis({
      signals: sampleSignals,
      problems: [],
    });
    const strategies = generateGrowthStrategy(diagnoses);
    const plans = buildMarketplaceActionPlans({ diagnoses, strategies });
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0].actions.length).toBeGreaterThan(0);
    expect(plans[0].priority).toBe("HIGH");
  });
});

describe("permissions", () => {
  it("allows admin", () => {
    expect(() => assertMarketplaceOperatorAccess("ADMIN")).not.toThrow();
  });

  it("denies seller", () => {
    expect(() => assertMarketplaceOperatorAccess("SELLER")).toThrow(
      MarketplaceOperatorForbiddenError,
    );
  });
});

describe("Feature flag", () => {
  beforeEach(() => {
    process.env.MARKETPLACE_OPERATOR_ENABLED = "true";
  });
  afterEach(() => {
    process.env.MARKETPLACE_OPERATOR_ENABLED = PREV_FLAG;
  });

  it("is enabled when env true", async () => {
    const { isMarketplaceOperatorEnabled } = await import(
      "@/lib/marketplace-operator/flags"
    );
    expect(isMarketplaceOperatorEnabled()).toBe(true);
  });
});
