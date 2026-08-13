import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  pickPriorityRecommendation,
  priorityFromCoach,
  priorityFromExecution,
  priorityFromGrowthAction,
} from "@/lib/ai-experience/priority";
import {
  assertAiExperienceAdminAccess,
  assertSellerAiCenterAccess,
  AiExperienceForbiddenError,
} from "@/lib/ai-experience/permissions";
import { explainRecommendation, formatOneActionHeadline } from "@/lib/ai-experience/recommendations";
import { buildGrowthOpportunityCards } from "@/lib/ai-experience/cards";
import { formatHappeningSummary } from "@/lib/ai-experience/dashboard";

const PREV_FLAG = process.env.AI_EXPERIENCE_ENABLED;

describe("pickPriorityRecommendation", () => {
  it("selects one best action from candidates", () => {
    const picked = pickPriorityRecommendation([
      priorityFromGrowthAction({
        action: "Добавьте фото",
        impact: "Больше доверия",
        reason: "Мало конверсии",
        priority: "MEDIUM",
      }),
      priorityFromExecution({
        title: "Исправить карточку",
        description: "Execution task",
        href: "/account/products",
        priority: "HIGH",
      }),
    ]);
    expect(picked?.source).toBe("EXECUTION_PRIORITY");
  });

  it("returns null when no candidates", () => {
    expect(pickPriorityRecommendation([])).toBeNull();
  });
});

describe("explainRecommendation", () => {
  it("formats one-action headline", () => {
    const rec = explainRecommendation(
      priorityFromCoach({
        action: "Добавьте характеристики",
        analysis: "Покупатели смотрят, но не покупают",
        benefit: "Увеличит доверие",
        howTo: "Заполните мощность и комплектацию",
      }),
    );
    expect(formatOneActionHeadline(rec)).toContain("характеристик");
    expect(rec.why).toContain("Покупатели");
  });
});

describe("aggregation cards", () => {
  it("builds growth opportunity cards", () => {
    const cards = buildGrowthOpportunityCards({
      readyForPromotion: 2,
      needsImprovement: 3,
      lowStock: 1,
      singleProduct: true,
    });
    expect(cards.length).toBeGreaterThanOrEqual(3);
    expect(cards.some((c) => c.id === "opp-promotion")).toBe(true);
  });

  it("formats happening summary", () => {
    expect(formatHappeningSummary({ totalViews: 240, totalProducts: 5 })).toContain(
      "240",
    );
  });
});

describe("permissions", () => {
  it("allows admin ai center", () => {
    expect(() => assertAiExperienceAdminAccess("ADMIN")).not.toThrow();
  });

  it("denies seller from admin ai center", () => {
    expect(() => assertAiExperienceAdminAccess("SELLER")).toThrow(
      AiExperienceForbiddenError,
    );
  });

  it("allows seller ai center", () => {
    expect(() => assertSellerAiCenterAccess("SELLER")).not.toThrow();
  });
});

describe("Feature flag", () => {
  beforeEach(() => {
    process.env.AI_EXPERIENCE_ENABLED = "true";
  });
  afterEach(() => {
    process.env.AI_EXPERIENCE_ENABLED = PREV_FLAG;
  });

  it("is enabled when env true", async () => {
    const { isAiExperienceEnabled } = await import("@/lib/ai-experience/flags");
    expect(isAiExperienceEnabled()).toBe(true);
  });
});
