import type { MarketplaceActionPlan, Priority } from "./types";

const priorityOrder: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/** Rank action plans by priority and impact score. */
export function prioritizeActionPlans(
  plans: MarketplaceActionPlan[],
): MarketplaceActionPlan[] {
  return [...plans].sort((a, b) => {
    const p = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (p !== 0) return p;
    return b.impactScore - a.impactScore;
  });
}

/** Top N recommended actions flattened from plans. */
export function extractRecommendedActions(
  plans: MarketplaceActionPlan[],
  limit = 6,
): MarketplaceActionPlan["actions"] {
  const seen = new Set<string>();
  const items: MarketplaceActionPlan["actions"] = [];

  for (const plan of plans) {
    for (const action of plan.actions) {
      const key = `${action.type}:${action.description}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(action);
      if (items.length >= limit) return items;
    }
  }

  return items;
}
