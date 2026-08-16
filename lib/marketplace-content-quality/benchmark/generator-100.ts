import type { ProductQualityInput } from "../types";
import { CONTENT_QUALITY_BENCHMARK_SCENARIOS } from "./scenarios";

const CATEGORIES = [
  "Отличная карточка",
  "Средняя",
  "Плохая",
  "Spam",
  "Irrelevant images",
  "Duplicates",
  "Contradictory",
  "Beautiful but weak commercial",
  "Commercially strong",
  "Moderation violation",
] as const;

/** 100 curated benchmark scenarios (deterministic templates). */
export function generateContentQualityBenchmark100(): ProductQualityInput[] {
  const base = CONTENT_QUALITY_BENCHMARK_SCENARIOS.map((fn) => fn());
  const extra: ProductQualityInput[] = [];

  for (let i = base.length; i < 100; i += 1) {
    const category = CATEGORIES[i % CATEGORIES.length]!;
    extra.push({
      productId: `benchmark-${String(i + 1).padStart(3, "0")}`,
      name: `Benchmark ${category} #${i + 1}`,
      description: `Scenario ${category} for content quality benchmark.`,
      categoryId: `cat-${i % 10}`,
      categoryName: category,
      images: [
        {
          id: `img-${i}`,
          url: `https://example.com/benchmark/${i}.jpg`,
          alt: category,
          sortOrder: 0,
          isPrimary: true,
        },
      ],
      characteristics: [{ name: "Test", slug: "test", value: String(i) }],
      hasVideo: i % 13 === 0,
      hints: {
        scenarioId: `benchmark-100-${i + 1}`,
        photoRelevance: category.includes("Irrelevant") ? 8 : 40 + (i % 50),
        descriptionQuality: category.includes("Spam") ? 15 : 50 + (i % 40),
        keywordStuffing: category.includes("Spam"),
        prohibited: category.includes("Moderation"),
        moderationRejected: category.includes("Moderation"),
      },
    });
  }

  return [...base, ...extra].slice(0, 100);
}
