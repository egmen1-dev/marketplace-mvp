import type {
  MarketplaceActionPlan,
  MarketplaceDiagnosis,
} from "@/lib/marketplace-operator/types";

import type {
  ExecutionPlanStatus,
  MarketplaceExecutionPlan,
  Priority,
} from "./types";

/** Build execution plans from operator action plans (advisory). */
export function buildExecutionPlans(input: {
  actionPlans: MarketplaceActionPlan[];
  diagnoses: MarketplaceDiagnosis[];
}): MarketplaceExecutionPlan[] {
  return input.actionPlans.slice(0, 6).map((plan) => {
    const diagnosis = input.diagnoses.find((d) => d.id === plan.diagnosisId);
    const status: ExecutionPlanStatus =
      plan.priority === "HIGH" ? "ACTIVE" : "DRAFT";

    return {
      id: `exec-${plan.id}`,
      title: plan.title,
      source: "MARKETPLACE_OPERATOR",
      goal: plan.expectedEffect,
      priority: plan.priority as Priority,
      status,
      category: diagnosis?.categoryName ?? null,
      tasks: [],
      impactScore: plan.impactScore,
    };
  });
}

export function mergeTasksIntoPlans(
  plans: MarketplaceExecutionPlan[],
  tasksByPlanId: Map<string, MarketplaceExecutionPlan["tasks"]>,
): MarketplaceExecutionPlan[] {
  return plans.map((plan) => ({
    ...plan,
    tasks: tasksByPlanId.get(plan.id) ?? [],
  }));
}
