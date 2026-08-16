import type { CrossAppProductKnowledge, ProductCategoryPackId } from "./types";

const registry: CrossAppProductKnowledge[] = [];

export function publishCrossAppProductKnowledge(
  entry: Omit<CrossAppProductKnowledge, "id" | "createdAt">,
): CrossAppProductKnowledge {
  const record: CrossAppProductKnowledge = {
    ...entry,
    id: `cpk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  registry.push(record);
  return record;
}

export function listCrossAppProductKnowledge(filter?: {
  targetApp?: CrossAppProductKnowledge["targetApps"][number];
  categoryPack?: ProductCategoryPackId;
  verifiedOnly?: boolean;
}): CrossAppProductKnowledge[] {
  return registry.filter((r) => {
    if (filter?.verifiedOnly && !r.verified) return false;
    if (filter?.targetApp && !r.targetApps.includes(filter.targetApp)) return false;
    if (filter?.categoryPack && r.categoryPack !== filter.categoryPack) return false;
    return true;
  });
}

export function resetCrossAppProductKnowledge(): void {
  registry.length = 0;
}
