import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { buildExecutionPlans } from "@/lib/marketplace-execution/execution-plan";
import {
  assertMarketplaceExecutionAccess,
  MarketplaceExecutionForbiddenError,
} from "@/lib/marketplace-execution/permissions";
import { applyTaskStatuses, calculateExecutionProgress } from "@/lib/marketplace-execution/progress";
import { generateExecutionTasks } from "@/lib/marketplace-execution/tasks";
import {
  assertTaskTransition,
  InvalidTaskTransitionError,
} from "@/lib/marketplace-execution/workflows";
import type { MarketplaceDiagnosis } from "@/lib/marketplace-operator/types";

const PREV_FLAG = process.env.MARKETPLACE_EXECUTION_ENABLED;

const diagnosis: MarketplaceDiagnosis = {
  id: "d1",
  issue: "Низкая конверсия карточек",
  category: "Conversion",
  severity: "HIGH",
  causes: ["мало качественных карточек", "нет продвижения"],
  impact: "потенциальная потеря продаж",
  categoryName: "Дрели",
};

describe("generateExecutionTasks", () => {
  it("expands diagnosis into actionable tasks", () => {
    const plans = buildExecutionPlans({
      actionPlans: [
        {
          id: "p1",
          title: "Рост категории электроинструмент",
          priority: "HIGH",
          actions: [
            { type: "PRODUCT_IMPROVEMENT", description: "Исправить карточки" },
            { type: "PROMOTION_LAUNCH", description: "Запустить продвижение" },
          ],
          impactScore: 84,
          expectedEffect: "Рост конверсии категории",
          diagnosisId: "d1",
        },
      ],
      diagnoses: [diagnosis],
    });

    const tasks = generateExecutionTasks({
      plan: plans[0],
      diagnosis,
      actions: [
        { type: "PRODUCT_IMPROVEMENT", description: "Исправить карточки" },
        { type: "PROMOTION_LAUNCH", description: "Запустить продвижение" },
      ],
    });

    expect(tasks.length).toBeGreaterThanOrEqual(4);
    expect(tasks.some((t) => t.title.includes("без фото"))).toBe(true);
    expect(tasks.some((t) => t.title.includes("продвижение"))).toBe(true);
  });
});

describe("task lifecycle", () => {
  it("allows pending to in progress to completed", () => {
    expect(() => assertTaskTransition("PENDING", "IN_PROGRESS")).not.toThrow();
    expect(() => assertTaskTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
  });

  it("blocks invalid transitions", () => {
    expect(() => assertTaskTransition("COMPLETED", "PENDING")).toThrow(
      InvalidTaskTransitionError,
    );
  });
});

describe("progress calculation", () => {
  it("computes completion rate", async () => {
    const progress = await calculateExecutionProgress(
      [
        {
          id: "t1",
          planId: "exec-p1",
          type: "PRODUCT_IMPROVEMENT",
          title: "Test",
          description: "d",
          owner: "ADMIN",
          priority: "HIGH",
          status: "COMPLETED",
          impact: "x",
          deadline: null,
        },
        {
          id: "t2",
          planId: "exec-p1",
          type: "SELLER_OUTREACH",
          title: "Test2",
          description: "d",
          owner: "ADMIN",
          priority: "HIGH",
          status: "PENDING",
          impact: "x",
          deadline: null,
        },
      ],
      80,
    );
    expect(progress.tasksTotal).toBe(2);
    expect(progress.tasksCompleted).toBe(1);
    expect(progress.completionRate).toBe(50);
  });

  it("applies persisted statuses", () => {
    const tasks = applyTaskStatuses(
      [
        {
          id: "t1",
          planId: "p",
          type: "PRODUCT_IMPROVEMENT",
          title: "A",
          description: "d",
          owner: "ADMIN",
          priority: "HIGH",
          status: "PENDING",
          impact: "x",
          deadline: null,
        },
      ],
      [{ taskId: "t1", status: "COMPLETED" }],
    );
    expect(tasks[0].status).toBe("COMPLETED");
  });
});

describe("permissions", () => {
  it("allows admin", () => {
    expect(() => assertMarketplaceExecutionAccess("ADMIN")).not.toThrow();
  });

  it("denies seller from admin execution", () => {
    expect(() => assertMarketplaceExecutionAccess("SELLER")).toThrow(
      MarketplaceExecutionForbiddenError,
    );
  });
});

describe("Feature flag", () => {
  beforeEach(() => {
    process.env.MARKETPLACE_EXECUTION_ENABLED = "true";
  });
  afterEach(() => {
    process.env.MARKETPLACE_EXECUTION_ENABLED = PREV_FLAG;
  });

  it("is enabled when env true", async () => {
    const { isMarketplaceExecutionEnabled } = await import(
      "@/lib/marketplace-execution/flags"
    );
    expect(isMarketplaceExecutionEnabled()).toBe(true);
  });
});
