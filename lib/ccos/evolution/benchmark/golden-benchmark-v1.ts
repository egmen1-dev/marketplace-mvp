/** Immutable golden benchmark — ccos-golden-benchmark-v1 */

export const GOLDEN_BENCHMARK_VERSION = "ccos-golden-benchmark-v1";

export type GoldenBenchmarkProduct = {
  id: string;
  category: string;
  segment:
    | "good"
    | "bad"
    | "cold_start"
    | "new_seller"
    | "established_seller"
    | "irrelevant_query"
    | "promoted_junk"
    | "dirty_socks_control"
    | "category_specific";
  qualityScore: number;
  relevanceScore: number;
  promotionActive: boolean;
  trustScore: number;
  coldStart: boolean;
  newSeller: boolean;
  photoCount: number;
  seoScore: number;
  description: string;
};

export const GOLDEN_BENCHMARK_PRODUCTS: GoldenBenchmarkProduct[] = [
  {
    id: "bench-good-fan",
    category: "climate",
    segment: "good",
    qualityScore: 82,
    relevanceScore: 88,
    promotionActive: false,
    trustScore: 85,
    coldStart: false,
    newSeller: false,
    photoCount: 5,
    seoScore: 75,
    description: "Quality fan with real specs",
  },
  {
    id: "bench-bad-junk",
    category: "misc",
    segment: "bad",
    qualityScore: 22,
    relevanceScore: 18,
    promotionActive: true,
    trustScore: 35,
    coldStart: false,
    newSeller: false,
    photoCount: 1,
    seoScore: 90,
    description: "Spam listing",
  },
  {
    id: "bench-cold-start",
    category: "tools",
    segment: "cold_start",
    qualityScore: 55,
    relevanceScore: 60,
    promotionActive: false,
    trustScore: 50,
    coldStart: true,
    newSeller: false,
    photoCount: 2,
    seoScore: 40,
    description: "No behaviour history",
  },
  {
    id: "bench-new-seller",
    category: "home",
    segment: "new_seller",
    qualityScore: 58,
    relevanceScore: 62,
    promotionActive: false,
    trustScore: 45,
    coldStart: false,
    newSeller: true,
    photoCount: 3,
    seoScore: 50,
    description: "New seller baseline",
  },
  {
    id: "bench-established",
    category: "electronics",
    segment: "established_seller",
    qualityScore: 78,
    relevanceScore: 80,
    promotionActive: false,
    trustScore: 88,
    coldStart: false,
    newSeller: false,
    photoCount: 6,
    seoScore: 70,
    description: "Established seller product",
  },
  {
    id: "bench-irrelevant",
    category: "socks",
    segment: "irrelevant_query",
    qualityScore: 40,
    relevanceScore: 12,
    promotionActive: false,
    trustScore: 60,
    coldStart: false,
    newSeller: false,
    photoCount: 4,
    seoScore: 85,
    description: "Irrelevant to fan query",
  },
  {
    id: "bench-promoted-junk",
    category: "misc",
    segment: "promoted_junk",
    qualityScore: 25,
    relevanceScore: 20,
    promotionActive: true,
    trustScore: 30,
    coldStart: false,
    newSeller: false,
    photoCount: 1,
    seoScore: 95,
    description: "Promoted low quality",
  },
  {
    id: "bench-dirty-socks",
    category: "climate",
    segment: "dirty_socks_control",
    qualityScore: 35,
    relevanceScore: 15,
    promotionActive: true,
    trustScore: 40,
    coldStart: false,
    newSeller: false,
    photoCount: 10,
    seoScore: 92,
    description: "Fan listing + 10 sock photos + excellent SEO + promotion",
  },
  {
    id: "bench-category-drill",
    category: "tools",
    segment: "category_specific",
    qualityScore: 72,
    relevanceScore: 76,
    promotionActive: false,
    trustScore: 70,
    coldStart: false,
    newSeller: false,
    photoCount: 4,
    seoScore: 65,
    description: "Category-specific drill",
  },
];

export function getGoldenBenchmark(version = GOLDEN_BENCHMARK_VERSION): GoldenBenchmarkProduct[] {
  if (version !== GOLDEN_BENCHMARK_VERSION) {
    throw new Error(`Unknown golden benchmark version: ${version}`);
  }
  return [...GOLDEN_BENCHMARK_PRODUCTS];
}
