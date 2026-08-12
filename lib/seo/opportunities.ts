/**
 * Search → SEO opportunities foundation (A-007 ready).
 */

export type SeoOpportunity = {
  query: string;
  kind: "popular" | "empty" | "category_demand";
  suggestedEntity: "PRODUCT_TYPE" | "BRAND" | "FACET" | "CATEGORY";
  note: string;
};

export function buildSeoOpportunities(input: {
  popularQueries?: string[];
  emptyQueries?: string[];
  topCategorySlugs?: string[];
}): SeoOpportunity[] {
  const out: SeoOpportunity[] = [];
  for (const q of input.popularQueries ?? []) {
    out.push({
      query: q,
      kind: "popular",
      suggestedEntity: "PRODUCT_TYPE",
      note: "Consider ProductType or facet landing if inventory exists",
    });
  }
  for (const q of input.emptyQueries ?? []) {
    out.push({
      query: q,
      kind: "empty",
      suggestedEntity: "CATEGORY",
      note: "Demand without inventory — do not index empty page",
    });
  }
  for (const slug of input.topCategorySlugs ?? []) {
    out.push({
      query: slug,
      kind: "category_demand",
      suggestedEntity: "CATEGORY",
      note: "Ensure category SEO page is indexable",
    });
  }
  return out.slice(0, 50);
}
