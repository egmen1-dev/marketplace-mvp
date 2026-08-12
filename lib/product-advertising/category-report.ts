import type { ProductAdSnapshotSource } from "./product-snapshot";
import { buildProductAdSnapshot } from "./product-snapshot";

/** Top-level categories tracked for ad launch readiness. */
export const ADS_CATEGORY_SLUGS = [
  "construction",
  "tools",
  "electronics",
  "clothing",
  "home",
] as const;

export type CategoryAdsReportRow = {
  slug: string;
  name: string;
  totalProducts: number;
  readyCount: number;
  blockedCount: number;
  readinessPct: number;
  topProblems: string[];
  avgQualityScore: number;
};

type CategoryProductInput = ProductAdSnapshotSource & {
  categorySlug: string | null;
  categoryName: string | null;
  topLevelSlug: string | null;
};

export function buildCategoryAdsReport(
  products: CategoryProductInput[],
  categoryNames: Record<string, string>,
): CategoryAdsReportRow[] {
  const byTopLevel = new Map<
    string,
    { ready: number; blocked: number; problems: Map<string, number>; qualitySum: number }
  >();

  for (const slug of ADS_CATEGORY_SLUGS) {
    byTopLevel.set(slug, {
      ready: 0,
      blocked: 0,
      problems: new Map(),
      qualitySum: 0,
    });
  }

  let counted = 0;
  for (const product of products) {
    const top = product.topLevelSlug;
    if (!top || !ADS_CATEGORY_SLUGS.includes(top as (typeof ADS_CATEGORY_SLUGS)[number])) {
      continue;
    }
    counted += 1;
    const bucket = byTopLevel.get(top)!;
    const snapshot = buildProductAdSnapshot(product);
    bucket.qualitySum += snapshot.quality.score;

    if (snapshot.eligibility.eligible) {
      bucket.ready += 1;
    } else {
      bucket.blocked += 1;
      for (const reason of snapshot.eligibility.reasons) {
        bucket.problems.set(reason, (bucket.problems.get(reason) ?? 0) + 1);
      }
    }
  }

  void counted;

  return ADS_CATEGORY_SLUGS.map((slug) => {
    const bucket = byTopLevel.get(slug)!;
    const total = bucket.ready + bucket.blocked;
    const topProblems = [...bucket.problems.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason]) => reason);

    return {
      slug,
      name: categoryNames[slug] ?? slug,
      totalProducts: total,
      readyCount: bucket.ready,
      blockedCount: bucket.blocked,
      readinessPct: total > 0 ? Math.round((bucket.ready / total) * 100) : 0,
      topProblems,
      avgQualityScore:
        total > 0 ? Math.round(bucket.qualitySum / total) : 0,
    };
  });
}
