import type { KnowledgePackId, KnowledgeScope } from "./types";

export const KNOWLEDGE_PACKS: KnowledgePackId[] = [
  "marketplace",
  "design",
  "search",
  "trust",
  "finance",
  "promotion",
  "seller",
  "buyer",
];

export function marketplaceScope(categoryId?: string, categorySlug?: string): KnowledgeScope {
  return {
    pack: "marketplace",
    categories: categoryId ? [categoryId] : undefined,
    categorySlugs: categorySlug ? [categorySlug] : undefined,
    apps: ["marketplace"],
  };
}

export function scopesMatch(scope: KnowledgeScope, context: {
  pack?: KnowledgePackId;
  categoryId?: string;
  categorySlug?: string;
  season?: string;
  device?: string;
}): boolean {
  if (context.pack && scope.pack !== context.pack) return false;

  if (scope.categories?.length && context.categoryId) {
    if (!scope.categories.includes(context.categoryId)) return false;
  }

  if (scope.categorySlugs?.length && context.categorySlug) {
    if (!scope.categorySlugs.includes(context.categorySlug)) return false;
  }

  if (scope.season && context.season && scope.season !== context.season) return false;
  if (scope.device && context.device && scope.device !== context.device) return false;

  return true;
}

export function assertCrossCategoryScope(scope: KnowledgeScope): void {
  if (scope.crossCategory === true && !scope.categories?.length && !scope.categorySlugs?.length) {
    throw new Error("Cross-category rules must declare explicit category scope");
  }
}
